use color_eyre::Section;
use ctor::ctor;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::{info, trace, warn};
use nextclade::align::align::{align_nuc, AlignPairwiseParams};
use nextclade::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use nextclade::align::strip_insertions::strip_insertions;
use nextclade::cli::nextalign_cli::{nextalign_parse_cli_args, NextalignCommands, NextalignRunArgs};
use nextclade::gene::gene_map::GeneMap;
use nextclade::io::aa::from_aa_seq;
use nextclade::io::fasta::{FastaReader, FastaRecord, FastaWriter};
use nextclade::io::gff3::read_gff3_file;
use nextclade::io::nuc::{from_nuc_seq, to_nuc_seq};
use nextclade::translate::translate_genes::{translate_genes, Translation};
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::utils::error::report_to_string;
use nextclade::utils::global_init::global_init;
use nextclade::{make_internal_error, make_internal_report};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
}

pub fn read_one_fasta(filepath: impl AsRef<Path>) -> Result<String, Report> {
  let filepath = filepath.as_ref();
  let mut reader = FastaReader::from_path(&filepath)?;
  let mut record = FastaRecord::default();
  reader.read(&mut record)?;
  Ok(record.seq)
}

pub fn write_translations(
  seq_name: &str,
  translations: &[Result<Translation, Report>],
  gene_fasta_writers: &mut HashMap<String, FastaWriter>,
) -> Result<(), Report> {
  translations
    .into_iter()
    .map(|translation_or_err| match translation_or_err {
      Ok(translation) => match gene_fasta_writers.get_mut(&translation.gene_name) {
        None => make_internal_error!("Fasta file writer not found for gene '{}'", &translation.gene_name),
        Some(writer) => writer.write(&seq_name, &from_aa_seq(&translation.seq)),
      },
      Err(report) => {
        warn!("In sequence '{}': {}", &seq_name, report_to_string(&report));
        Ok(())
      }
    })
    .collect::<Result<(), Report>>()?;

  Ok(())
}

fn run(args: NextalignRunArgs) -> Result<(), Report> {
  info!("Command-line arguments:\n{args:#?}");

  let NextalignRunArgs {
    input_fasta,
    input_ref,
    genes,
    genemap,
    output_dir,
    output_basename,
    include_reference,
    output_fasta,
    output_insertions,
    output_errors,
    jobs,
    in_order,
  } = args;

  let params = AlignPairwiseParams::default();
  info!("Params:\n{params:#?}");

  trace!("Reading ref sequence from '{input_ref:#?}'");
  let ref_seq = to_nuc_seq(&read_one_fasta(input_ref)?)?;

  trace!("Reading gene map from '{genemap:#?}'");
  let gene_map = match (genemap, genes) {
    // Read gene map and retain only requested genes
    (Some(genemap), Some(genes)) => read_gff3_file(&genemap)?
      .into_iter()
      .filter(|(gene_name, ..)| genes.contains(gene_name))
      .collect(),
    _ => GeneMap::new(),
  };

  trace!("Creating fasta reader from file '{input_fasta:#?}'");
  let mut reader = FastaReader::from_path(&input_fasta)?;
  let mut record = FastaRecord::default();

  let output_fasta_some = &output_fasta.ok_or_else(|| make_internal_report!("Output fasta path is not set"))?;
  trace!("Creating fasta writer to file '{output_fasta_some:#?}'");
  let mut writer = FastaWriter::from_path(&output_fasta_some)?;

  let mut gene_fasta_writers = gene_map
    .iter()
    .map(|(gene_name, _)| -> Result<_, Report> {
      let out_gene_fasta_path = format!("tmp/nextalign.gene.{gene_name}_new.fasta");

      trace!("Creating fasta writer to file '{out_gene_fasta_path}'");
      let writer = FastaWriter::from_path(&out_gene_fasta_path)?;

      Ok((gene_name.to_owned(), writer))
    })
    .collect::<Result<HashMap<String, FastaWriter>, Report>>()?;

  trace!("Creating gap open scores");
  let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &params);
  let gap_open_close_aa = get_gap_open_close_scores_flat(&ref_seq, &params);

  trace!("Translating reference sequence");
  let ref_peptides = translate_genes_ref(&ref_seq, &gene_map, &params)?;

  trace!("Starting main loop");
  while let Ok(()) = reader.read(&mut record) {
    if record.is_empty() {
      break;
    }

    info!("Processing sequence  '{}'", &record.seq_name);

    trace!("Reading sequence  '{}'", &record.seq_name);
    let qry_seq = to_nuc_seq(&record.seq)?;

    trace!("Aligning sequence '{}'", &record.seq_name);
    match align_nuc(&qry_seq, &ref_seq, &gap_open_close_nuc, &params) {
      Err(report) => {
        warn!("In sequence '{}': {}", &record.seq_name, report_to_string(&report));
      }
      Ok(alignment) => {
        trace!("Translating sequence '{}'", &record.seq_name);
        let translations = translate_genes(
          &alignment.qry_seq,
          &alignment.ref_seq,
          &ref_peptides,
          &gene_map,
          &gap_open_close_aa,
          &params,
        );

        trace!("Stripping sequence '{}'", &record.seq_name);
        let stripped = strip_insertions(&alignment.qry_seq, &alignment.ref_seq);

        trace!("Writing sequence  '{}'", &record.seq_name);
        writer.write(&record.seq_name, &from_nuc_seq(&stripped.qry_seq))?;

        trace!("Writing translations for '{}'", &record.seq_name);
        write_translations(&record.seq_name, &translations, &mut gene_fasta_writers)?;
      }
    }

    record.clear();
  }

  trace!("Success");
  Ok(())
}

fn main() -> Result<(), Report> {
  let args = nextalign_parse_cli_args()?;

  match args.command {
    Some(NextalignCommands::Run { 0: run_args }) => run(*run_args),
    _ => Ok(()),
  }
}
