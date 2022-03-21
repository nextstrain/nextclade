use color_eyre::Section;
use ctor::ctor;
use eyre::Report;
use itertools::Itertools;
use log::{info, trace, warn};
use nextclade::align::align::{align_nuc, AlignPairwiseParams};
use nextclade::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use nextclade::align::strip_insertions::strip_insertions;
use nextclade::cli::nextalign_cli::{nextalign_parse_cli_args, NextalignCommands, NextalignRunArgs};
use nextclade::gene::gene_map::GeneMap;
use nextclade::io::aa::from_aa_seq;
use nextclade::io::fasta::{read_one_fasta, FastaReader, FastaRecord, FastaWriter};
use nextclade::io::gff3::read_gff3_file;
use nextclade::io::insertions_csv::InsertionsCsvWriter;
use nextclade::io::nuc::{from_nuc_seq, to_nuc_seq, Nuc};
use nextclade::translate::peptide::PeptideMap;
use nextclade::translate::translate_genes::{translate_genes, Translation};
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::utils::error::report_to_string;
use nextclade::utils::global_init::global_init;
use nextclade::{make_internal_error, make_internal_report};
use std::collections::HashMap;

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
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
        warn!(
          "In sequence '{}': {}. Note that this gene will not be included in the results of the sequence.",
          &seq_name,
          report_to_string(&report)
        );
        Ok(())
      }
    })
    .collect::<Result<(), Report>>()?;
  Ok(())
}

pub fn run_one<'a>(
  record: &'a FastaRecord,
  ref_seq: &[Nuc],
  ref_peptides: &PeptideMap,
  gene_map: &GeneMap,
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
  fasta_writer: &mut FastaWriter,
  gene_fasta_writers: &mut HashMap<String, FastaWriter>,
  insertions_csv_writer: &mut InsertionsCsvWriter,
) -> Result<(), Report> {
  let FastaRecord { seq_name, seq, index } = record;

  info!("Processing sequence  '{seq_name}'");
  let qry_seq = to_nuc_seq(&seq)?;

  trace!("Aligning sequence '{}'", &seq_name);
  match align_nuc(&qry_seq, &ref_seq, &gap_open_close_nuc, &params) {
    Err(report) => {
      warn!(
        "In sequence '{}': {}. Note that this sequence will not be included in the results.",
        &seq_name,
        report_to_string(&report)
      );
    }
    Ok(alignment) => {
      trace!("Translating sequence '{}'", &seq_name);
      let translations = translate_genes(
        &alignment.qry_seq,
        &alignment.ref_seq,
        &ref_peptides,
        &gene_map,
        &gap_open_close_aa,
        &params,
      );

      trace!("Stripping sequence '{}'", &seq_name);
      let stripped = strip_insertions(&alignment.qry_seq, &alignment.ref_seq);

      trace!("Writing sequence  '{}'", &seq_name);
      fasta_writer.write(&seq_name, &from_nuc_seq(&stripped.qry_seq))?;

      trace!("Writing translations for '{}'", &seq_name);
      write_translations(&seq_name, &translations, gene_fasta_writers)?;

      insertions_csv_writer.write(&seq_name, &stripped.insertions, &translations);
    }
  }

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

  let output_basename = output_basename.ok_or_else(|| make_internal_report!("output_basename is not set"))?;
  let output_dir = output_dir.ok_or_else(|| make_internal_report!("output_dir path is not set"))?;
  let output_insertions = output_insertions.ok_or_else(|| make_internal_report!("output_insertions is not set"))?;

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

  let output_fasta_some = &output_fasta.ok_or_else(|| make_internal_report!("output_fasta path is not set"))?;
  trace!("Creating fasta writer to file '{output_fasta_some:#?}'");
  let mut fasta_writer = FastaWriter::from_path(&output_fasta_some)?;

  let mut gene_fasta_writers = gene_map
    .iter()
    .map(|(gene_name, _)| -> Result<_, Report> {
      let out_gene_fasta_path = output_dir
        .clone()
        .join(format!("{output_basename}.gene.{gene_name}.fasta"));

      trace!("Creating fasta writer to file {out_gene_fasta_path:#?}");
      let writer = FastaWriter::from_path(&out_gene_fasta_path)?;

      Ok((gene_name.to_owned(), writer))
    })
    .collect::<Result<HashMap<String, FastaWriter>, Report>>()?;

  trace!("Creating insertions.csv writer into '{output_insertions:?}'");
  let mut insertions_csv_writer = InsertionsCsvWriter::new(&output_insertions)?;

  trace!("Creating gap open scores");
  let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &params);
  let gap_open_close_aa = get_gap_open_close_scores_flat(&ref_seq, &params);

  trace!("Translating reference sequence");
  let ref_peptides = translate_genes_ref(&ref_seq, &gene_map, &params)?;

  trace!("Starting main loop");
  let mut record = FastaRecord::default();
  loop {
    reader.read(&mut record)?;
    if record.is_empty() {
      break;
    }

    run_one(
      &record,
      &ref_seq,
      &ref_peptides,
      &gene_map,
      &gap_open_close_nuc,
      &gap_open_close_aa,
      &params,
      &mut fasta_writer,
      &mut gene_fasta_writers,
      &mut insertions_csv_writer,
    );

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
