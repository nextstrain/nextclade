use crate::cli::nextclade_cli::{
  NextcladeRunArgs, NextcladeRunInputArgs, NextcladeRunOtherParams, NextcladeRunOutputArgs,
};
use crate::cli::nextclade_ordered_writer::NextcladeOrderedWriter;
use crate::dataset::dataset_download::{
  dataset_dir_load, dataset_individual_files_load, dataset_str_download_and_load, dataset_zip_load,
};
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::info;
use nextclade::gene::gene_map_display::gene_map_to_table_string;
use nextclade::graph::graph::convert_graph_to_auspice_tree;
use nextclade::io::fasta::{FastaReader, FastaRecord};
use nextclade::io::fs::has_extension;
use nextclade::io::json::{json_write, JsonPretty};
use nextclade::io::nextclade_csv::CsvColumnConfig;
use nextclade::io::nwk_writer::nwk_write_to_file;
use nextclade::make_error;
use nextclade::run::nextclade_wasm::{AnalysisOutput, Nextclade, NextcladeParams};
use nextclade::tree::tree_builder::graph_attach_new_nodes_in_place;
use nextclade::types::outputs::NextcladeOutputs;
use std::path::PathBuf;

pub struct NextcladeRecord {
  pub index: usize,
  pub seq_name: String,
  pub outputs_or_err: Result<AnalysisOutput, Report>,
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
) -> Result<NextcladeParams, Report> {
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
    inputs: NextcladeRunInputArgs {
      input_fastas, genes, ..
    },
    outputs:
      NextcladeRunOutputArgs {
        output_columns_selection,
        output_graph,
        output_tree,
        output_tree_nwk,
        ..
      },
    params,
    other_params: NextcladeRunOtherParams { jobs },
  } = run_args.clone();

  let inputs = nextclade_get_inputs(&run_args, &genes)?;
  let nextclade = Nextclade::new(inputs, &params)?;

  let should_write_tree = output_tree.is_some() || output_tree_nwk.is_some() || output_graph.is_some();
  let mut outputs = Vec::<NextcladeOutputs>::new();

  let csv_column_config = CsvColumnConfig::new(&output_columns_selection)?;

  info!("Parameters (final):\n{:#?}", &nextclade.params);
  info!("Gene map:\n{}", gene_map_to_table_string(&nextclade.gene_map)?);

  std::thread::scope(|s| {
    const CHANNEL_SIZE: usize = 128;
    let (fasta_sender, fasta_receiver) = crossbeam_channel::bounded::<FastaRecord>(CHANNEL_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded::<NextcladeRecord>(CHANNEL_SIZE);

    let nextclade = &nextclade;
    let outputs = &mut outputs;
    let run_args = &run_args;

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

      s.spawn(move || {
        let result_sender = result_sender.clone();

        for fasta_record in &fasta_receiver {
          info!("Processing sequence '{}'", fasta_record.seq_name);

          let outputs_or_err = nextclade.run(&fasta_record).wrap_err_with(|| {
            format!(
              "When processing sequence #{} '{}'",
              fasta_record.index, fasta_record.seq_name
            )
          });

          // Important: **all** records should be sent into this channel, without skipping.
          // In in-order mode, writer that receives from this channel expects a contiguous stream of indices. Gaps in
          // the indices will cause writer to stall waiting for the missing index and the buffering queue to grow. Any
          // filtering of records should be done in the writer, instead of here.
          result_sender
            .send(NextcladeRecord {
              index: fasta_record.index,
              seq_name: fasta_record.seq_name,
              outputs_or_err,
            })
            .wrap_err("When sending NextcladeRecord")
            .unwrap();
        }

        drop(result_sender);
      });
    }

    let writer = s.spawn(move || {
      let nextclade = &nextclade;

      let aa_motif_keys = nextclade
        .aa_motifs_descs
        .iter()
        .map(|desc| desc.name.clone())
        .collect_vec();

      let mut output_writer = NextcladeOrderedWriter::new(
        &nextclade.gene_map,
        &nextclade.clade_node_attrs,
        &nextclade.phenotype_attr_descs,
        &aa_motif_keys,
        &csv_column_config,
        &run_args.outputs,
        &nextclade.params,
      )
      .wrap_err("When creating output writer")
      .unwrap();

      if nextclade.params.general.include_reference {
        output_writer
          .write_ref(&nextclade.ref_record, &nextclade.ref_translation)
          .wrap_err("When writing output record for ref sequence")
          .unwrap();
      }

      for record in result_receiver {
        if should_write_tree {
          // Save analysis results if they will be needed later
          if let Ok(AnalysisOutput { analysis_result, .. }) = &record.outputs_or_err {
            outputs.push(analysis_result.clone());
          }
        }

        output_writer
          .write_record(record)
          .wrap_err("When writing output record")
          .unwrap();
      }
    });
  });

  if should_write_tree {
    let Nextclade {
      ref_seq,
      mut graph,
      params,
      ..
    } = nextclade;

    graph_attach_new_nodes_in_place(&mut graph, outputs, ref_seq.len(), &params.tree_builder)?;

    if let Some(output_tree) = output_tree {
      let tree = convert_graph_to_auspice_tree(&graph)?;
      json_write(output_tree, &tree, JsonPretty(true))?;
    }

    if let Some(output_tree_nwk) = output_tree_nwk {
      nwk_write_to_file(output_tree_nwk, &graph)?;
    }

    if let Some(output_graph) = run_args.outputs.output_graph {
      json_write(output_graph, &graph, JsonPretty(true))?;
    }
  }

  Ok(())
}
