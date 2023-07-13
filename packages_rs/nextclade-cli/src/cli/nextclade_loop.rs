use crate::cli::nextclade_cli::{
  NextcladeRunArgs, NextcladeRunInputArgs, NextcladeRunOtherArgs, NextcladeRunOutputArgs,
};
use crate::cli::nextclade_ordered_writer::NextcladeOrderedWriter;
use crate::dataset::dataset_download::{
  dataset_dir_load, dataset_individual_files_load, dataset_str_download_and_load, dataset_zip_load, DatasetFilesContent,
};
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::info;
use nextclade::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use nextclade::align::params::AlignPairwiseParams;
use nextclade::alphabet::nuc::{to_nuc_seq, to_nuc_seq_replacing, Nuc};
use nextclade::analyze::find_aa_motifs::find_aa_motifs;
use nextclade::analyze::phenotype::get_phenotype_attr_descs;
use nextclade::gene::gene_map_display::gene_map_to_table_string;
use nextclade::graph::graph::convert_graph_to_auspice_tree;
use nextclade::io::fasta::{FastaReader, FastaRecord};
use nextclade::io::fs::has_extension;
use nextclade::io::json::json_write;
use nextclade::io::nextclade_csv::CsvColumnConfig;
use nextclade::make_error;
use nextclade::run::nextclade_run_one::nextclade_run_one;
use nextclade::translate::translate_genes::Translation;
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::tree::params::TreeBuilderParams;
use nextclade::tree::tree::AuspiceTreeNode;
use nextclade::tree::tree_builder::graph_attach_new_nodes_in_place;
use nextclade::tree::tree_preprocess::tree_preprocess_in_place;
use nextclade::types::outputs::NextcladeOutputs;
use std::path::PathBuf;

pub struct NextcladeRecord {
  pub index: usize,
  pub seq_name: String,
  pub outputs_or_err: Result<(Vec<Nuc>, Translation, NextcladeOutputs), Report>,
}

pub struct DatasetFilePaths {
  input_ref: PathBuf,
  input_tree: PathBuf,
  input_qc_config: PathBuf,
  input_virus_properties: PathBuf,
  input_pcr_primers: PathBuf,
  input_gene_map: PathBuf,
}

pub fn nextclade_get_inputs(
  run_args: &NextcladeRunArgs,
  genes: &Option<Vec<String>>,
) -> Result<DatasetFilesContent, Report> {
  if let Some(dataset_name) = run_args.inputs.dataset_name.as_ref() {
    dataset_str_download_and_load(run_args, dataset_name, genes)
      .wrap_err_with(|| format!("When downloading dataset '{dataset_name}'"))
  } else if let Some(input_dataset) = run_args.inputs.input_dataset.as_ref() {
    if input_dataset.is_file() && has_extension(input_dataset, "zip") {
      dataset_zip_load(run_args, input_dataset, genes)
    } else if input_dataset.is_dir() {
      dataset_dir_load(run_args.clone(), input_dataset, genes)
    } else {
      make_error!(
        "--input-dataset: path is invalid. \
        Expected a directory path or a zip archive file path, but got: '{input_dataset:#?}'"
      )
    }
  } else {
    dataset_individual_files_load(run_args, genes)
  }
}

pub fn nextclade_run(run_args: NextcladeRunArgs) -> Result<(), Report> {
  info!("Command-line arguments:\n{run_args:#?}");

  let NextcladeRunArgs {
    inputs:
      NextcladeRunInputArgs {
        input_fastas,
        input_dataset,
        input_ref,
        input_tree,
        input_qc_config,
        input_virus_properties,
        input_pcr_primers,
        input_gene_map,
        genes,
        ..
      },
    outputs:
      NextcladeRunOutputArgs {
        output_all,
        output_basename,
        output_selection,
        output_fasta,
        output_translations,
        output_ndjson,
        output_json,
        output_csv,
        output_tsv,
        output_columns_selection,
        output_tree,
        output_insertions,
        output_errors,
        include_reference,
        include_nearest_node_info,
        in_order,
        replace_unknown,
        ..
      },
    other: NextcladeRunOtherArgs { jobs },
    tree_builder_params,
    alignment_params,
  } = run_args.clone();

  let DatasetFilesContent {
    ref_record,
    virus_properties,
    mut tree,
    ref gene_map,
    qc_config,
    primers,
  } = nextclade_get_inputs(&run_args, &genes)?;

  let ref_seq = &to_nuc_seq(&ref_record.seq).wrap_err("When reading reference sequence")?;

  let alignment_params = {
    let mut alignment_params = AlignPairwiseParams::default();

    // Merge alignment params coming from virus_properties into alignment_params
    if let Some(alignment_params_from_file) = &virus_properties.alignment_params {
      alignment_params.merge_opt(alignment_params_from_file.clone());
    }

    // Merge alignment params coming from CLI arguments
    alignment_params.merge_opt(run_args.alignment_params);

    alignment_params
  };

  let tree_builder_params = {
    let mut tree_builder_params = TreeBuilderParams::default();

    // Merge tree builder params coming from virus_properties into alignment_params
    if let Some(tree_builder_params_from_file) = &virus_properties.tree_builder_params {
      tree_builder_params.merge_opt(tree_builder_params_from_file.clone());
    }

    // Merge tree builder params coming from CLI arguments
    tree_builder_params.merge_opt(run_args.tree_builder_params);

    tree_builder_params
  };

  info!("Alignment parameters (final):\n{alignment_params:#?}");
  info!("Tree builder parameters (final):\n{tree_builder_params:#?}");
  info!("Gene map:\n{}", gene_map_to_table_string(gene_map)?);

  let gap_open_close_nuc = &get_gap_open_close_scores_codon_aware(ref_seq, gene_map, &alignment_params);
  let gap_open_close_aa = &get_gap_open_close_scores_flat(ref_seq, &alignment_params);

  let ref_translation =
    &translate_genes_ref(ref_seq, gene_map, &alignment_params).wrap_err("When translating reference genes")?;

  let ref_cds_translations = ref_translation
    .genes()
    .flat_map(|gene| gene.cdses.values())
    .cloned()
    .collect_vec();

  let aa_motifs_ref = &find_aa_motifs(&virus_properties.aa_motifs, ref_translation)?;

  let should_keep_outputs = output_tree.is_some();
  let mut outputs = Vec::<NextcladeOutputs>::new();

  let phenotype_attrs = &get_phenotype_attr_descs(&virus_properties);

  let mut graph = tree_preprocess_in_place(&mut tree, ref_seq, ref_translation).unwrap();
  let clade_node_attrs = tree.clade_node_attr_descs();

  let aa_motifs_keys = &virus_properties
    .aa_motifs
    .iter()
    .map(|desc| desc.name.clone())
    .collect_vec();

  let csv_column_config = CsvColumnConfig::new(&output_columns_selection)?;

  std::thread::scope(|s| {
    const CHANNEL_SIZE: usize = 128;
    let (fasta_sender, fasta_receiver) = crossbeam_channel::bounded::<FastaRecord>(CHANNEL_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded::<NextcladeRecord>(CHANNEL_SIZE);

    let outputs = &mut outputs;

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

    for _ in 0..jobs {
      let fasta_receiver = fasta_receiver.clone();
      let result_sender = result_sender.clone();
      let gap_open_close_nuc = &gap_open_close_nuc;
      let gap_open_close_aa = &gap_open_close_aa;
      let alignment_params = &alignment_params;
      let ref_translation = &ref_translation;
      let primers = &primers;
      let tree = &tree;
      let qc_config = &qc_config;
      let virus_properties = &virus_properties;

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
            nextclade_run_one(
              index,
              &seq_name,
              &qry_seq,
              ref_seq,
              ref_translation,
              aa_motifs_ref,
              gene_map,
              primers,
              tree,
              qc_config,
              virus_properties,
              gap_open_close_nuc,
              gap_open_close_aa,
              alignment_params,
              include_nearest_node_info,
            )
          });

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

    let writer = s.spawn(move || {
      let mut output_writer = NextcladeOrderedWriter::new(
        gene_map,
        clade_node_attrs,
        phenotype_attrs,
        aa_motifs_keys,
        &output_fasta,
        &output_json,
        &output_ndjson,
        &output_csv,
        &output_tsv,
        &output_insertions,
        &output_errors,
        &output_translations,
        &csv_column_config,
        in_order,
      )
      .wrap_err("When creating output writer")
      .unwrap();

      if include_reference {
        output_writer
          .write_ref(&ref_record, ref_translation)
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
  });

  if let Some(output_tree) = run_args.outputs.output_tree {
    // Attach sequences to graph in greedy approach, building a tree
    graph_attach_new_nodes_in_place(
      &mut graph,
      outputs,
      &tree.tmp.divergence_units,
      ref_seq.len(),
      &tree_builder_params,
    )?;

    let root: AuspiceTreeNode = convert_graph_to_auspice_tree(&graph)?;
    tree.tree = root;

    json_write(output_tree, &tree)?;
  }

  Ok(())
}
