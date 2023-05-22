use crate::cli::nextalign_cli::{
  NextalignRunArgs, NextalignRunInputArgs, NextalignRunOtherArgs, NextalignRunOutputArgs,
};
use crate::cli::nextalign_ordered_writer::NextalignOrderedWriter;
use eyre::{Report, WrapErr};
use log::info;
use nextclade::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use nextclade::align::params::AlignPairwiseParams;
use nextclade::io::fasta::{read_one_fasta, FastaReader, FastaRecord};
use nextclade::io::gene_map::{filter_gene_map, GeneMap};
use nextclade::io::nuc::{to_nuc_seq, to_nuc_seq_replacing};
use nextclade::run::nextalign_run_one::nextalign_run_one;
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::types::outputs::NextalignOutputs;

pub struct NextalignRecord {
  pub index: usize,
  pub seq_name: String,
  pub outputs_or_err: Result<NextalignOutputs, Report>,
}

pub fn nextalign_run(run_args: NextalignRunArgs) -> Result<(), Report> {
  info!("Command-line arguments:\n{run_args:#?}");

  let NextalignRunArgs {
    inputs:
      NextalignRunInputArgs {
        input_fastas,
        input_ref,
        input_gene_map,
        genes,
        ..
      },
    outputs:
      NextalignRunOutputArgs {
        output_all,
        output_basename,
        output_selection,
        output_fasta,
        output_translations,
        output_insertions,
        output_errors,
        include_reference,
        replace_unknown,
        in_order,
        ..
      },
    other: NextalignRunOtherArgs { jobs },
    alignment_params: alignment_params_from_cli,
  } = run_args;

  let mut alignment_params = AlignPairwiseParams::default();

  // Merge alignment params coming from CLI arguments
  alignment_params.merge_opt(alignment_params_from_cli);

  let ref_record = &read_one_fasta(input_ref)?;
  let ref_seq = &to_nuc_seq(&ref_record.seq).wrap_err("When reading reference sequence")?;

  let gene_map = match input_gene_map {
    Some(input_gene_map) => {
      let gene_map = GeneMap::from_gff3_file(input_gene_map)?;
      filter_gene_map(Some(gene_map), &genes)?
    }
    None => GeneMap::new(),
  };

  // info!("Gene map:\n{}", gene_map_to_string(&gene_map)?);

  let gap_open_close_nuc = &get_gap_open_close_scores_codon_aware(ref_seq, &gene_map, &alignment_params);
  let gap_open_close_aa = &get_gap_open_close_scores_flat(ref_seq, &alignment_params);

  let ref_peptides = &translate_genes_ref(ref_seq, &gene_map, &alignment_params)?;

  std::thread::scope(|s| {
    const CHANNEL_SIZE: usize = 128;
    let (fasta_sender, fasta_receiver) = crossbeam_channel::bounded::<FastaRecord>(CHANNEL_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded::<NextalignRecord>(CHANNEL_SIZE);

    s.spawn(|| {
      let mut reader = FastaReader::from_paths(&input_fastas).unwrap();
      loop {
        let mut record = FastaRecord::default();
        reader.read(&mut record).unwrap();
        if record.is_empty() {
          break;
        }
        fasta_sender
          .send(record)
          .wrap_err("When sending a FastaRecord")
          .unwrap();
      }
      drop(fasta_sender);
    });

    let gene_map = &gene_map;
    for _ in 0..jobs {
      let fasta_receiver = fasta_receiver.clone();
      let result_sender = result_sender.clone();
      let gap_open_close_nuc = &gap_open_close_nuc;
      let gap_open_close_aa = &gap_open_close_aa;
      let alignment_params = &alignment_params;

      s.spawn(move || {
        let result_sender = result_sender.clone();

        for FastaRecord { seq_name, seq, index } in &fasta_receiver {
          info!("Processing sequence '{seq_name}'");

          let outputs_or_err = if replace_unknown {
            Ok(to_nuc_seq_replacing(&seq))
          } else {
            to_nuc_seq(&seq)
          }
          .wrap_err_with(|| format!("When processing sequence #{index} '{seq_name}'"))
          .and_then(|qry_seq| {
            nextalign_run_one(
              index,
              &seq_name,
              &qry_seq,
              ref_seq,
              ref_peptides,
              gene_map,
              gap_open_close_nuc,
              gap_open_close_aa,
              alignment_params,
            )
          });

          let record = NextalignRecord {
            index,
            seq_name,
            outputs_or_err,
          };

          // Important: **all** records should be sent into this channel, without skipping.
          // In in-order mode, writer that receives from this channel expects a contiguous stream of indices. Gaps in
          // the indices will cause writer to stall waiting for the missing index and the buffering queue to grow. Any
          // filtering of records should be done in the writer, instead of here.
          result_sender
            .send(record)
            .wrap_err("When sending NextalignRecord")
            .unwrap();
        }

        drop(result_sender);
      });
    }

    s.spawn(move || {
      let mut output_writer = NextalignOrderedWriter::new(
        gene_map,
        &output_fasta,
        &output_translations,
        &output_insertions,
        &output_errors,
        in_order,
      )
      .wrap_err("When creating output writer")
      .unwrap();

      if include_reference {
        output_writer
          .write_ref(ref_record, ref_peptides)
          .wrap_err("When writing output record for ref sequence")
          .unwrap();
      }

      for record in result_receiver {
        output_writer
          .write_record(record)
          .wrap_err("When writing output record")
          .unwrap();
      }
    });
  });

  Ok(())
}
