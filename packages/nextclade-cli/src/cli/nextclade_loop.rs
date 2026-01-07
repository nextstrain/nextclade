use crate::cli::nextclade_cli::{NextcladeOutputSelection, NextcladeRunArgs};
use crate::cli::nextclade_ordered_writer::NextcladeOrderedWriter;
use crate::dataset::dataset_download::nextclade_get_inputs;
use eyre::{ContextCompat, Report, WrapErr};
use log::info;
use nextclade::analyze::pcr_primers::PcrPrimer;
use nextclade::gene::gene_map_display::gene_map_to_table_string;
use nextclade::graph::graph::Graph;
use nextclade::io::fasta::{FastaReader, FastaRecord};
use nextclade::io::json::{JsonPretty, json_write};
use nextclade::io::nextclade_csv_column_config::CsvColumnConfig;
use nextclade::io::nwk_writer::nwk_write_to_file;
use nextclade::run::nextclade_wasm::{AnalysisInitialData, AnalysisOutput, Nextclade};
use nextclade::tree::tree_builder::graph_attach_new_nodes_in_place;
use nextclade::types::outputs::NextcladeOutputs;
use nextclade::utils::option::OptionMapRefFallible;
use std::sync::{Arc, Mutex};

pub struct NextcladeRecord {
  pub index: usize,
  pub seq_name: String,
  pub outputs_or_err: Result<AnalysisOutput, Report>,
}

pub fn nextclade_run(mut run_args: NextcladeRunArgs) -> Result<(), Report> {
  info!("Command-line arguments:\n{run_args:#?}");

  let inputs = nextclade_get_inputs(&run_args, &run_args.inputs.cds_selection)?;

  if inputs.gene_map.is_empty() {
    // If there is no genome annotation, then we cannot emit these output files
    let to_remove = [
      NextcladeOutputSelection::Gff,
      NextcladeOutputSelection::Tbl,
      NextcladeOutputSelection::All,
      NextcladeOutputSelection::Translations,
    ];
    run_args.outputs.output_selection.retain(|o| !to_remove.contains(o));
    run_args.outputs.output_annotation_gff = None;
    run_args.outputs.output_annotation_tbl = None;
    run_args.outputs.output_translations = None;
  }

  let primers = run_args
    .inputs
    .input_pcr_primers
    .as_ref()
    .map_ref_fallible(|input_pcr_primers| PcrPrimer::from_path(input_pcr_primers, &inputs.ref_record.seq))?
    .wrap_err("When parsing PCR primers input CSV")
    .unwrap_or_default();

  let nextclade = Nextclade::new(inputs, primers, &run_args.params)?;

  let should_write_tree = run_args.outputs.output_tree.is_some()
    || run_args.outputs.output_tree_nwk.is_some()
    || run_args.outputs.output_graph.is_some();
  let mut outputs = Vec::<NextcladeOutputs>::new();

  let csv_column_config = CsvColumnConfig::new(&run_args.outputs.output_columns_selection)?;

  info!("Parameters (final):\n{:#?}", &nextclade.params);
  info!("Genome annotation:\n{}", gene_map_to_table_string(&nextclade.gene_map)?);

  let thread_errors: Arc<Mutex<Vec<Report>>> = Arc::new(Mutex::new(Vec::new()));

  std::thread::scope(|s| {
    const CHANNEL_SIZE: usize = 128;
    let (fasta_sender, fasta_receiver) = crossbeam_channel::bounded::<FastaRecord>(CHANNEL_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded::<NextcladeRecord>(CHANNEL_SIZE);

    let nextclade = &nextclade;
    let outputs = &mut outputs;
    let run_args = &run_args;

    let thread_errors_cloned = Arc::clone(&thread_errors);
    s.spawn(move || {
      let result = (|| {
        let mut reader = FastaReader::from_paths(&run_args.inputs.input_fastas)?;
        loop {
          let mut record = FastaRecord::default();
          reader.read(&mut record)?;
          if record.is_empty() {
            break;
          }
          fasta_sender.send(record).wrap_err("When sending a FastaRecord")?;
        }
        Ok::<_, Report>(())
      })();
      if let Err(e) = result {
        thread_errors_cloned.lock().unwrap().push(e);
      }
      drop(fasta_sender);
    });

    for _ in 0..run_args.other_params.jobs {
      let fasta_receiver = fasta_receiver.clone();
      let result_sender = result_sender.clone();
      let thread_errors = Arc::clone(&thread_errors);

      s.spawn(move || {
        let result = (|| {
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
              .wrap_err("When sending NextcladeRecord")?;
          }
          Ok::<_, Report>(())
        })();

        if let Err(e) = result {
          thread_errors.lock().unwrap().push(e);
        }
        drop(result_sender);
      });
    }

    let thread_errors_cloned = Arc::clone(&thread_errors);
    s.spawn(move || {
      let result = (|| {
        let AnalysisInitialData {
          clade_node_attr_key_descs,
          phenotype_attr_descs,
          aa_motif_keys,
          ref_nodes,
          ..
        } = nextclade.get_initial_data();

        let mut output_writer = NextcladeOrderedWriter::new(
          &nextclade.gene_map,
          &clade_node_attr_key_descs,
          &phenotype_attr_descs,
          &ref_nodes,
          &aa_motif_keys,
          &csv_column_config,
          &run_args.outputs,
          &nextclade.params,
        )
        .wrap_err("When creating output writer")?;

        if nextclade.params.general.include_reference {
          output_writer
            .write_ref(&nextclade.ref_record, &nextclade.ref_translation)
            .wrap_err("When writing output record for ref sequence")?;
        }

        for record in result_receiver {
          if should_write_tree && let Ok(AnalysisOutput { analysis_result, .. }) = &record.outputs_or_err {
            outputs.push(analysis_result.clone());
          }
          output_writer
            .write_record(record)
            .wrap_err("When writing output record")?;
        }

        Ok::<_, Report>(())
      })();

      if let Err(e) = result {
        thread_errors_cloned.lock().unwrap().push(e);
      }
    });
  });

  let mut errors = Arc::try_unwrap(thread_errors).unwrap_or_default().into_inner()?;
  if !errors.is_empty() {
    return Err(errors.remove(0));
  }

  if should_write_tree {
    let Nextclade {
      ref_seq, params, graph, ..
    } = nextclade;
    if let Some(mut graph) = graph {
      graph_attach_new_nodes_in_place(&mut graph, outputs, ref_seq.len(), &params.tree_builder)?;

      if let Some(output_tree) = run_args.outputs.output_tree {
        let tree = Graph::to_auspice_tree(&graph)?;
        json_write(output_tree, &tree, JsonPretty(true))?;
      }

      if let Some(output_tree_nwk) = run_args.outputs.output_tree_nwk {
        nwk_write_to_file(output_tree_nwk, &graph)?;
      }

      if let Some(output_graph) = run_args.outputs.output_graph {
        json_write(output_graph, &graph, JsonPretty(true))?;
      }
    }
  }

  Ok(())
}
