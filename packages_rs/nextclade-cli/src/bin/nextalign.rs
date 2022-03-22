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
use nextclade::io::errors_csv::ErrorsCsvWriter;
use nextclade::io::fasta::{
  read_one_fasta, write_translations, FastaPeptideWriter, FastaReader, FastaRecord, FastaWriter,
};
use nextclade::io::gff3::read_gff3_file;
use nextclade::io::insertions_csv::InsertionsCsvWriter;
use nextclade::io::nuc::{from_nuc_seq, to_nuc_seq, Nuc};
use nextclade::option_get_some;
use nextclade::translate::peptide::PeptideMap;
use nextclade::translate::translate_genes::translate_genes;
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::utils::error::report_to_string;
use nextclade::utils::global_init::global_init;

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
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
  fasta_peptide_writer: &mut FastaPeptideWriter,
  insertions_csv_writer: &mut InsertionsCsvWriter,
  errors_csv_writer: &mut ErrorsCsvWriter,
) -> Result<(), Report> {
  let FastaRecord { seq_name, seq, index } = record;

  info!("Processing sequence  '{seq_name}'");
  let qry_seq = to_nuc_seq(seq)?;

  trace!("Aligning sequence '{}'", &seq_name);
  match align_nuc(&qry_seq, ref_seq, gap_open_close_nuc, params) {
    Err(report) => {
      let cause = report_to_string(&report);
      let message =
        format!("In sequence '{seq_name}': {cause}. Note that this sequence will not be included in the results.");
      warn!("{message}");
      errors_csv_writer.write_nuc_error(seq_name, &message);
    }
    Ok(alignment) => {
      trace!("Translating sequence '{}'", &seq_name);
      let translations = translate_genes(
        &alignment.qry_seq,
        &alignment.ref_seq,
        ref_peptides,
        gene_map,
        gap_open_close_aa,
        params,
      );

      trace!("Stripping sequence '{}'", &seq_name);
      let stripped = strip_insertions(&alignment.qry_seq, &alignment.ref_seq);

      trace!("Writing sequence  '{}'", &seq_name);
      fasta_writer.write(seq_name, &from_nuc_seq(&stripped.qry_seq))?;

      trace!("Writing translations for '{}'", &seq_name);
      write_translations(seq_name, &translations, fasta_peptide_writer)?;

      trace!("Writing insertions.csv for '{}'", &seq_name);
      insertions_csv_writer.write(seq_name, &stripped.insertions, &translations);

      trace!("Writing errors.csv for '{}'", &seq_name);
      errors_csv_writer.write_aa_errors(seq_name, &translations, gene_map);
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

  let output_fasta = option_get_some!(output_fasta)?;
  let output_basename = option_get_some!(output_basename)?;
  let output_dir = option_get_some!(output_dir)?;
  let output_insertions = option_get_some!(output_insertions)?;
  let output_errors = option_get_some!(output_errors)?;

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

  trace!("Creating fasta writer to file '{output_fasta:#?}'");
  let mut fasta_writer = FastaWriter::from_path(&output_fasta)?;

  trace!("Creating peptide writer to directory '{output_dir:#?}' with basename '{output_basename}'");
  let mut fasta_peptide_writer = FastaPeptideWriter::new(&gene_map, &output_dir, &output_basename)?;

  trace!("Creating insertions.csv writer into '{output_insertions:?}'");
  let mut insertions_csv_writer = InsertionsCsvWriter::new(&output_insertions)?;

  trace!("Creating errors.csv writer into '{output_errors:?}'");
  let mut errors_csv_writer = ErrorsCsvWriter::new(&output_errors)?;

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
      &mut fasta_peptide_writer,
      &mut insertions_csv_writer,
      &mut errors_csv_writer,
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
