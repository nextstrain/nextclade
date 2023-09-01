use crate::cli::nextclade_cli::NextcladeSeqSortArgs;
use crate::dataset::dataset_download::download_datasets_index_json;
use crate::io::http_client::HttpClient;
use eyre::{Report, WrapErr};
use log::{info, LevelFilter};
use nextclade::io::fasta::{FastaReader, FastaRecord};
use nextclade::make_error;
use nextclade::sort::minimizer_index::{MinimizerIndexJson, MINIMIZER_INDEX_ALGO_VERSION};
use nextclade::sort::minimizer_search::{run_minimizer_search, MinimizerSearchResult};

#[derive(Debug, Clone)]
struct MinimizerSearchRecord {
  pub fasta_record: FastaRecord,
  pub result: MinimizerSearchResult,
}

pub fn nextclade_seq_sort(args: &NextcladeSeqSortArgs) -> Result<(), Report> {
  let NextcladeSeqSortArgs {
    server, proxy_config, ..
  } = args;

  let verbose = log::max_level() > LevelFilter::Info;

  let mut http = HttpClient::new(server, proxy_config, verbose)?;

  let index = download_datasets_index_json(&mut http)?;

  let minimizer_index_path = index
    .minimizer_index
    .iter()
    .find(|minimizer_index| MINIMIZER_INDEX_ALGO_VERSION == minimizer_index.version)
    .map(|minimizer_index| &minimizer_index.path);

  if let Some(minimizer_index_path) = minimizer_index_path {
    let minimizer_index_str = http.get(minimizer_index_path)?;
    let minimizer_index = MinimizerIndexJson::from_str(String::from_utf8(minimizer_index_str)?)?;
    run(args, &minimizer_index)
  } else {
    make_error!("No supported reference search index data is found for this dataset sever. Try to to upgrade Nextclade to the latest version or contain dataset server maintainers.")
  }
}

pub fn run(args: &NextcladeSeqSortArgs, minimizer_index: &MinimizerIndexJson) -> Result<(), Report> {
  let NextcladeSeqSortArgs {
    input_fastas,
    output_dir,
    server,
    proxy_config,
    jobs,
  } = args;

  std::thread::scope(|s| {
    const CHANNEL_SIZE: usize = 128;
    let (fasta_sender, fasta_receiver) = crossbeam_channel::bounded::<FastaRecord>(CHANNEL_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded::<MinimizerSearchRecord>(CHANNEL_SIZE);

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
        let result_sender = result_sender.clone();

        for fasta_record in &fasta_receiver {
          info!("Processing sequence '{}'", fasta_record.seq_name);

          let result = run_minimizer_search(&fasta_record)
            .wrap_err_with(|| {
              format!(
                "When processing sequence #{} '{}'",
                fasta_record.index, fasta_record.seq_name
              )
            })
            .unwrap();

          result_sender
            .send(MinimizerSearchRecord { fasta_record, result })
            .wrap_err("When sending minimizer record into the channel")
            .unwrap();
        }

        drop(result_sender);
      });
    }

    let writer = s.spawn(move || {
      for record in result_receiver {
        println!("{}", &record.fasta_record.seq_name);
      }
    });
  });

  Ok(())
}
