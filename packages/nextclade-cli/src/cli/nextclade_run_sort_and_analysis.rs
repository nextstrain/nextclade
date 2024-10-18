use crate::cli::nextclade_cli::{
  NextcladeOutputSelection, NextcladeRunOtherParams, NextcladeRunOutputArgs, NextcladeSortArgs,
};
use crate::cli::nextclade_loop::NextcladeRecord;
use crate::cli::nextclade_ordered_writer::NextcladeOrderedWriter;
use crate::cli::nextclade_seq_sort::{get_all_prefix_names, StatsPrinter};
use crate::dataset::dataset_download::{dataset_download_by_name, download_datasets_index_json};
use crate::io::http_client::{HttpClient, ProxyConfig};
use crossbeam_channel::{Receiver, Sender};
use crossbeam_skiplist::SkipMap;
use eyre::{ContextCompat, Report, WrapErr};
use itertools::Itertools;
use log::LevelFilter;
use nextclade::io::csv::CsvStructFileWriter;
use nextclade::io::fasta::{FastaReader, FastaRecord, FastaWriter};
use nextclade::io::fs::add_extension;
use nextclade::io::nextclade_csv::CsvColumnConfig;
use nextclade::make_error;
use nextclade::run::nextclade_wasm::{AnalysisInitialData, AnalysisOutput, Nextclade};
use nextclade::run::params::NextcladeInputParamsOptional;
use nextclade::sort::minimizer_index::{MinimizerIndexJson, MINIMIZER_INDEX_ALGO_VERSION};
use nextclade::sort::minimizer_search::{run_minimizer_search, MinimizerSearchResult};
use nextclade::sort::params::NextcladeSeqSortParams;
use nextclade::utils::entry::MapEntryFallible;
use nextclade::utils::option::{OptionMapMutFallible, OptionMapRefFallible};
use schemars::JsonSchema;
use serde::Serialize;
use std::collections::btree_map::Entry::{Occupied, Vacant};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use strum::IntoEnumIterator;
use tinytemplate::TinyTemplate;
use url::Url;

pub fn nextclade_run_sort_and_analysis(args: &NextcladeSortArgs) -> Result<(), Report> {
  // info!("Command-line arguments:\n{run_args:#?}");

  let NextcladeSortArgs {
    input_minimizer_index_json,
    server,
    proxy_config,
    ..
  } = args;

  // let NextcladeRunArgs {
  //   inputs: NextcladeRunInputArgs {
  //     input_fastas,
  //     cds_selection: cdses,
  //     ..
  //   },
  //   outputs:
  //     NextcladeRunOutputArgs {
  //       output_columns_selection,
  //       output_graph,
  //       output_tree,
  //       output_tree_nwk,
  //       ..
  //     },
  //   params,
  //   other_params: NextcladeRunOtherParams { jobs },
  // } = run_args.clone();

  let verbose = log::max_level() >= LevelFilter::Info;

  let minimizer_index = if let Some(input_minimizer_index_json) = &input_minimizer_index_json {
    // If a file is provided, use data from it
    MinimizerIndexJson::from_path(input_minimizer_index_json)
  } else {
    // Otherwise fetch from dataset server
    let http = HttpClient::new(server, proxy_config, verbose)?;
    let index = download_datasets_index_json(&http)?;
    let minimizer_index_path = index
      .minimizer_index
      .iter()
      .find(|minimizer_index| MINIMIZER_INDEX_ALGO_VERSION == minimizer_index.version)
      .map(|minimizer_index| &minimizer_index.path);

    if let Some(minimizer_index_path) = minimizer_index_path {
      let minimizer_index_str = http.get(minimizer_index_path)?;
      MinimizerIndexJson::from_str(String::from_utf8(minimizer_index_str)?)
    } else {
      let server_versions = index
        .minimizer_index
        .iter()
        .map(|minimizer_index| format!("'{}'", minimizer_index.version))
        .join(",");
      let server_versions = if server_versions.is_empty() {
        "none available".to_owned()
      } else {
        format!(": {server_versions}")
      };

      make_error!("No compatible reference minimizer index data is found for this dataset sever. Cannot proceed. \n\nThis version of Nextclade supports index versions up to '{}', but the server has {}.\n\nTry to to upgrade Nextclade to the latest version and/or contact dataset server maintainers.", MINIMIZER_INDEX_ALGO_VERSION, server_versions)
    }
  }?;

  run(args, &minimizer_index, verbose)
}

pub fn run(args: &NextcladeSortArgs, minimizer_index: &MinimizerIndexJson, verbose: bool) -> Result<(), Report> {
  let NextcladeSortArgs {
    input_fastas,
    search_params,
    other_params: NextcladeRunOtherParams { jobs },
    server,
    output_dir,
    // output_columns_selection,
    // output_selection,
    ..
  } = args;

  let csv_column_config = CsvColumnConfig::new(&[])?;
  let output_basename = "nextclade".to_owned();
  let output_selection = &NextcladeOutputSelection::iter().collect_vec();
  let should_write_tree = [NextcladeOutputSelection::Tree, NextcladeOutputSelection::TreeNwk]
    .iter()
    .any(|x| output_selection.contains(x));

  let nextclades = &SkipMap::new();

  std::thread::scope(|s| {
    const CHANNEL_SIZE: usize = 128;
    let (fasta_sender, fasta_receiver) = crossbeam_channel::bounded::<FastaRecord>(CHANNEL_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded::<WorkerResultRecord>(CHANNEL_SIZE);

    s.spawn(|| {
      let mut reader = FastaReader::from_paths(input_fastas).unwrap();
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

    for _ in 0..*jobs {
      let fasta_receiver = fasta_receiver.clone();
      let result_sender = result_sender.clone();

      s.spawn(move || {
        worker_thread(
          minimizer_index,
          verbose,
          search_params,
          server,
          &fasta_receiver,
          &result_sender,
          nextclades,
        )
        .unwrap();

        drop(result_sender);
      });
    }

    s.spawn(move || {
      let mut sort_writer = SortWriter::new(args, verbose).unwrap();
      let mut output_writers = BTreeMap::new();
      let mut outputs = BTreeMap::new();

      for record in result_receiver {
        let WorkerResultRecord {
          dataset_name,
          fasta_record,
          sort_result,
          analysis_result,
        } = record;

        sort_writer.write(sort_result, &fasta_record).unwrap();

        let nextclade = nextclades.get(&dataset_name).unwrap();
        let nextclade = nextclade.value();

        let output_writer = output_writers
          .entry(dataset_name.clone())
          .or_insert_with_key_fallible(|dataset_name| -> Result<NextcladeOrderedWriter, Report> {
            let AnalysisInitialData {
              clade_node_attr_key_descs,
              phenotype_attr_descs,
              aa_motif_keys,
              ..
            } = nextclade.get_initial_data();

            let default_output_file_path = output_dir.clone().unwrap().join(dataset_name).join(&output_basename);

            let output_fasta = output_selection
              .contains(&NextcladeOutputSelection::Fasta)
              .then(|| add_extension(&default_output_file_path, "aligned.fasta"));

            let output_translations = output_selection
              .contains(&NextcladeOutputSelection::Translations)
              .then(|| -> Result<String, Report> {
                let output_translations_path =
                  default_output_file_path.with_file_name(format!("{output_basename}.cds_translation.{{cds}}"));
                let output_translations_path = add_extension(output_translations_path, "fasta");

                let output_translations = output_translations_path
                  .to_str()
                  .wrap_err_with(|| format!("When converting path to string: '{output_translations_path:?}'"))?
                  .to_owned();

                Ok(output_translations)
              })
              .transpose()?;

            let output_ndjson = output_selection
              .contains(&NextcladeOutputSelection::Ndjson)
              .then(|| add_extension(&default_output_file_path, "ndjson"));

            let output_json = output_selection
              .contains(&NextcladeOutputSelection::Json)
              .then(|| add_extension(&default_output_file_path, "json"));

            let output_csv = output_selection
              .contains(&NextcladeOutputSelection::Csv)
              .then(|| add_extension(&default_output_file_path, "csv"));

            let output_tsv = output_selection
              .contains(&NextcladeOutputSelection::Tsv)
              .then(|| add_extension(&default_output_file_path, "tsv"));

            let mut output_writer = NextcladeOrderedWriter::new(
              &nextclade.gene_map,
              clade_node_attr_key_descs,
              phenotype_attr_descs,
              aa_motif_keys,
              &csv_column_config,
              &NextcladeRunOutputArgs {
                output_dir: output_dir.to_owned(),
                output_fasta,
                output_translations,
                output_ndjson,
                output_json,
                output_csv,
                output_tsv,
                ..NextcladeRunOutputArgs::default()
              },
              &nextclade.params,
            )
            .wrap_err("When creating output writer")?;

            if nextclade.params.general.include_reference {
              output_writer
                .write_ref(&nextclade.ref_record, &nextclade.ref_translation)
                .wrap_err("When writing output record for ref sequence")?;
            }
            Ok(output_writer)
          })
          .unwrap();

        if should_write_tree {
          // Save analysis results if they will be needed later
          if let Ok(AnalysisOutput { analysis_result, .. }) = &analysis_result.outputs_or_err {
            outputs
              .entry(dataset_name.clone())
              .or_insert_with(|| vec![analysis_result.clone()])
              .push(analysis_result.clone());
          }
        }

        output_writer
          .write_record(analysis_result)
          .wrap_err("When writing output record")
          .unwrap();
      }

      // // for (dataset_name, nextclade) in nextclades {
      // for entry in nextclades {
      //   // let writer = output_writers.remove(&dataset_name).unwrap();
      //   let outputs = outputs.remove(&dataset_name).unwrap();
      //
      //   let Nextclade {
      //     ref_seq, params, graph, ..
      //   } = nextclade;
      //
      //   if let Some(mut graph) = graph {
      //     graph_attach_new_nodes_in_place(&mut graph, outputs, ref_seq.len(), &params.tree_builder).unwrap();
      //
      //     let default_output_file_path = output_dir.clone().unwrap().join(dataset_name).join(&output_basename);
      //
      //     if output_selection.contains(&NextcladeOutputSelection::Tree) {
      //       let tree = convert_graph_to_auspice_tree(&graph).unwrap();
      //       let output_tree = add_extension(&default_output_file_path, "auspice.json");
      //       json_write(output_tree, &tree, JsonPretty(true)).unwrap();
      //     }
      //
      //     if output_selection.contains(&NextcladeOutputSelection::TreeNwk) {
      //       let output_tree_nwk = add_extension(&default_output_file_path, "nwk");
      //       nwk_write_to_file(output_tree_nwk, &graph).unwrap();
      //     }
      //   }
      // }
    });
  });

  Ok(())
}

#[derive(Debug)]
pub struct WorkerResultRecord {
  pub fasta_record: FastaRecord,
  pub sort_result: MinimizerSearchResult,
  pub analysis_result: NextcladeRecord,
  pub dataset_name: String,
}

fn worker_thread(
  minimizer_index: &MinimizerIndexJson,
  verbose: bool,
  search_params: &NextcladeSeqSortParams,
  server: &Url,
  fasta_receiver: &Receiver<FastaRecord>,
  result_sender: &Sender<WorkerResultRecord>,
  nextclades: &SkipMap<String, Nextclade>,
) -> Result<(), Report> {
  for fasta_record in fasta_receiver {
    // info!("Processing sequence '{}'", fasta_record.seq_name);

    let sort_result = run_minimizer_search(&fasta_record, minimizer_index, search_params).wrap_err_with(|| {
      format!(
        "When processing sequence #{} '{}'",
        fasta_record.index, fasta_record.seq_name
      )
    })?;

    let http = HttpClient::new(server, &ProxyConfig::default(), verbose)?;
    if let Some(dataset) = sort_result.datasets.first() {
      let nextclade_kv = nextclades.get_or_insert_with(dataset.name.clone(), || {
        let inputs = dataset_download_by_name(&http, &dataset.name).unwrap();
        Nextclade::new(inputs, vec![], &NextcladeInputParamsOptional::default()).unwrap()
      });
      let nextclade = nextclade_kv.value();

      let outputs_or_err = nextclade.run(&fasta_record).wrap_err_with(|| {
        format!(
          "When processing sequence #{} '{}'",
          fasta_record.index, fasta_record.seq_name
        )
      });

      let analysis_result = NextcladeRecord {
        index: fasta_record.index,
        seq_name: fasta_record.seq_name.clone(),
        outputs_or_err,
      };

      result_sender
        .send(WorkerResultRecord {
          dataset_name: dataset.name.clone(),
          fasta_record,
          sort_result,
          analysis_result,
        })
        .wrap_err("When sending minimizer record into the channel")?;
    } else {
      // TODO(sort-and-run): decide what to do if dataset is not detected
    }
  }

  Ok(())
}

pub struct SortWriter<'a> {
  all_matches: bool,
  writers: BTreeMap<PathBuf, FastaWriter>,
  stats: StatsPrinter,
  output_dir: Option<PathBuf>,
  template: Option<TinyTemplate<'a>>,
  results_csv: Option<CsvStructFileWriter>,
}

impl Drop for SortWriter<'_> {
  fn drop(&mut self) {
    self.stats.finish();
  }
}

impl<'a> SortWriter<'a> {
  pub fn new(args: &'a NextcladeSortArgs, verbose: bool) -> Result<Self, Report> {
    let NextcladeSortArgs {
      output_dir,
      output_path,
      output_results_tsv,
      search_params,
      ..
    } = args;

    let template = output_path.map_ref_fallible(move |output_path| -> Result<TinyTemplate, Report> {
      let mut template = TinyTemplate::new();
      template
        .add_template("output", output_path)
        .wrap_err_with(|| format!("When parsing template: '{output_path}'"))?;
      Ok(template)
    })?;

    let stats = StatsPrinter::new(verbose);

    let results_csv =
      output_results_tsv.map_ref_fallible(|output_results_tsv| CsvStructFileWriter::new(output_results_tsv, b'\t'))?;

    Ok(Self {
      writers: BTreeMap::new(),
      all_matches: search_params.all_matches,
      output_dir: output_dir.clone(),
      template,
      stats,
      results_csv,
    })
  }

  pub fn write(&mut self, result: MinimizerSearchResult, fasta_record: &FastaRecord) -> Result<(), Report> {
    let datasets = &{
      if self.all_matches {
        result.datasets
      } else {
        result.datasets.into_iter().take(1).collect_vec()
      }
    };

    self.stats.print_seq(datasets, &fasta_record.seq_name);

    if datasets.is_empty() {
      self.results_csv.map_mut_fallible(|results_csv| {
        results_csv.write(&SeqSortCsvEntry {
          index: fasta_record.index,
          seq_name: &fasta_record.seq_name,
          dataset: None,
          score: None,
          num_hits: None,
        })
      })?;
    }

    for dataset in datasets {
      self.results_csv.map_mut_fallible(|results_csv| {
        results_csv.write(&SeqSortCsvEntry {
          index: fasta_record.index,
          seq_name: &fasta_record.seq_name,
          dataset: Some(&dataset.name),
          score: Some(dataset.score),
          num_hits: Some(dataset.n_hits),
        })
      })?;
    }

    let names = datasets
      .iter()
      .map(|dataset| get_all_prefix_names(&dataset.name))
      .collect::<Result<Vec<Vec<String>>, Report>>()?
      .into_iter()
      .flatten()
      .unique();

    for name in names {
      let filepath = Self::get_filepath(&name, &self.template, &self.output_dir)?;

      if let Some(filepath) = filepath {
        let writer = Self::get_or_insert_writer(&mut self.writers, filepath)?;
        writer.write(&fasta_record.seq_name, &fasta_record.seq, false)?;
      }
    }

    Ok(())
  }

  fn get_or_insert_writer(
    writers: &mut BTreeMap<PathBuf, FastaWriter>,
    filepath: impl AsRef<Path>,
  ) -> Result<&mut FastaWriter, Report> {
    Ok(match writers.entry(filepath.as_ref().to_owned()) {
      Occupied(e) => e.into_mut(),
      Vacant(e) => e.insert(FastaWriter::from_path(filepath)?),
    })
  }

  fn get_filepath(
    name: &str,
    tt: &Option<TinyTemplate>,
    output_dir: &Option<PathBuf>,
  ) -> Result<Option<PathBuf>, Report> {
    Ok(match (&tt, output_dir) {
      (Some(tt), None) => {
        let filepath_str = tt
          .render("output", &OutputTemplateContext { name })
          .wrap_err("When rendering output path template")?;
        Some(PathBuf::from_str(&filepath_str).wrap_err_with(|| format!("Invalid output path: '{filepath_str}'"))?)
      }
      (None, Some(output_dir)) => Some(output_dir.join(name).join("sequences.fasta")),
      _ => None,
    })
  }
}

#[derive(Clone, Default, Debug, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SeqSortCsvEntry<'a> {
  pub index: usize,
  pub seq_name: &'a str,
  pub dataset: Option<&'a str>,
  pub score: Option<f64>,
  pub num_hits: Option<u64>,
}

#[derive(Serialize)]
struct OutputTemplateContext<'a> {
  name: &'a str,
}
