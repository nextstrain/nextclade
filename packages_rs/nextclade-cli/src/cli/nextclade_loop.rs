use crate::cli::nextclade_cli::NextcladeRunArgs;
use crate::cli::nextclade_ordered_writer::NextcladeOrderedWriter;
use crossbeam::thread;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::info;
use nextclade::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use nextclade::analyze::pcr_primers::PcrPrimer;
use nextclade::analyze::virus_properties::VirusProperties;
use nextclade::io::fasta::{read_one_fasta, FastaReader, FastaRecord};
use nextclade::io::gene_map::{read_gene_map, GeneMap};
use nextclade::io::gff3::read_gff3_file;
use nextclade::io::json::json_write;
use nextclade::io::nuc::{from_nuc_seq, to_nuc_seq, Nuc};
use nextclade::option_get_some;
use nextclade::qc::qc_config::QcConfig;
use nextclade::run::nextclade_run_one::nextclade_run_one;
use nextclade::translate::translate_genes::Translation;
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::tree::tree::AuspiceTree;
use nextclade::tree::tree_attach_new_nodes::tree_attach_new_nodes_in_place;
use nextclade::tree::tree_preprocess::tree_preprocess_in_place;
use nextclade::types::outputs::NextcladeOutputs;
use serde::{Deserialize, Serialize};

pub struct NextcladeRecord {
  pub index: usize,
  pub seq_name: String,
  pub outputs_or_err: Result<(Vec<Nuc>, Vec<Translation>, NextcladeOutputs), Report>,
}

pub fn nextclade_run(args: NextcladeRunArgs) -> Result<(), Report> {
  info!("Command-line arguments:\n{args:#?}");

  let NextcladeRunArgs {
    input_fasta,
    input_ref,
    input_tree,
    input_qc_config,
    input_virus_properties,
    input_pcr_primers,
    input_gene_map,
    genes,
    output_dir,
    output_basename,
    include_reference,
    output_fasta,
    output_ndjson,
    output_json,
    output_csv,
    output_tsv,
    output_tree,
    output_insertions,
    output_errors,
    jobs,
    in_order,
    alignment_params,
    ..
  } = args;

  let input_ref = option_get_some!(input_ref)?;
  let input_tree = option_get_some!(input_tree)?;
  let input_qc_config = option_get_some!(input_qc_config)?;
  let input_virus_properties = option_get_some!(input_virus_properties)?;
  let input_pcr_primers = option_get_some!(input_pcr_primers)?;

  let output_fasta = option_get_some!(output_fasta)?;
  let output_basename = option_get_some!(output_basename)?;
  let output_dir = option_get_some!(output_dir)?;
  let output_insertions = option_get_some!(output_insertions)?;
  let output_errors = option_get_some!(output_errors)?;
  let output_json = option_get_some!(output_json)?;
  let output_ndjson = option_get_some!(output_ndjson)?;
  let output_csv = option_get_some!(output_csv)?;
  let output_tsv = option_get_some!(output_tsv)?;

  let ref_record = &read_one_fasta(input_ref)?;
  let ref_seq = &to_nuc_seq(&ref_record.seq)?;

  let gene_map = &read_gene_map(&input_gene_map, &genes)?;

  let gap_open_close_nuc = &get_gap_open_close_scores_codon_aware(ref_seq, gene_map, &alignment_params);
  let gap_open_close_aa = &get_gap_open_close_scores_flat(ref_seq, &alignment_params);

  let ref_peptides = &translate_genes_ref(ref_seq, gene_map, &alignment_params)?;

  let tree = &mut AuspiceTree::from_path(&input_tree)?;

  let qc_config = &QcConfig::from_path(&input_qc_config)?;

  let virus_properties = &VirusProperties::from_path(&input_virus_properties)?;

  let ref_seq_str = from_nuc_seq(ref_seq);
  let primers = &PcrPrimer::from_path(&input_pcr_primers, &ref_seq_str)?;

  let should_keep_outputs = output_tree.is_some();
  let mut outputs = Vec::<NextcladeOutputs>::new();

  thread::scope(|s| {
    const CHANNEL_SIZE: usize = 128;
    let (fasta_sender, fasta_receiver) = crossbeam_channel::bounded::<FastaRecord>(CHANNEL_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded::<NextcladeRecord>(CHANNEL_SIZE);

    tree_preprocess_in_place(tree, ref_seq, ref_peptides).unwrap();
    let clade_node_attrs = tree.clade_node_attr_descs();

    let outputs = &mut outputs;

    s.spawn(|_| {
      let mut reader = FastaReader::from_path(&input_fasta).unwrap();
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

    for _ in 0..jobs {
      let fasta_receiver = fasta_receiver.clone();
      let result_sender = result_sender.clone();
      let gap_open_close_nuc = &gap_open_close_nuc;
      let gap_open_close_aa = &gap_open_close_aa;
      let alignment_params = &alignment_params;
      let tree = &tree;

      s.spawn(move |_| {
        let result_sender = result_sender.clone();

        for FastaRecord { seq_name, seq, index } in &fasta_receiver {
          info!("Processing sequence '{seq_name}'");
          let qry_seq = to_nuc_seq(&seq)
            .wrap_err_with(|| format!("When processing sequence #{index} '{seq_name}'"))
            .unwrap();

          let outputs_or_err = nextclade_run_one(
            &seq_name,
            &qry_seq,
            ref_seq,
            ref_peptides,
            gene_map,
            primers,
            tree,
            qc_config,
            virus_properties,
            gap_open_close_nuc,
            gap_open_close_aa,
            alignment_params,
          );

          let record = NextcladeRecord {
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
            .wrap_err("When sending NextcladeRecord")
            .unwrap();
        }

        drop(result_sender);
      });
    }

    let writer = s.spawn(move |_| {
      let mut output_writer = NextcladeOrderedWriter::new(
        gene_map,
        clade_node_attrs,
        &output_fasta,
        &output_json,
        &output_ndjson,
        &output_csv,
        &output_tsv,
        &output_insertions,
        &output_errors,
        &output_dir,
        &output_basename,
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
        if should_keep_outputs {
          if let Ok((_, _, nextclade_outputs)) = &record.outputs_or_err {
            outputs.push(nextclade_outputs.clone());
          }
        }

        output_writer
          .write_record(record)
          .wrap_err("When writing output record")
          .unwrap();
      }
    });
  })
  .unwrap();

  if let Some(output_tree) = output_tree {
    tree_attach_new_nodes_in_place(tree, &outputs);
    json_write(output_tree, tree)?;
  }

  Ok(())
}
