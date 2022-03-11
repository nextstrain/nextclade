use color_eyre::Section;
use ctor::ctor;
use eyre::Report;
use itertools::Itertools;
use log::{trace, warn};
use nextclade::align::align::{align_nuc, AlignPairwiseParams};
use nextclade::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use nextclade::align::strip_insertions::strip_insertions;
use nextclade::io::aa::from_aa_seq;
use nextclade::io::fasta::{FastaReader, FastaRecord, FastaWriter};
use nextclade::io::fs::ensure_dir;
use nextclade::io::gff3::read_gff3_file;
use nextclade::io::nuc::{from_nuc_seq, to_nuc_seq};
use nextclade::make_internal_error;
use nextclade::translate::translate_genes::{translate_genes, Translation};
use nextclade::translate::translate_genes_ref::translate_genes_ref;
use nextclade::utils::error::report_to_string;
use nextclade::utils::global_init::global_init;
use std::collections::HashMap;
use std::error::Error;
use std::fs::File;
use std::io::{BufReader, BufWriter};

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
}

pub fn read_one_fasta(filepath: &str) -> Result<String, Report> {
  let mut reader = FastaReader::new(BufReader::with_capacity(32 * 1024, File::open(filepath)?));
  let mut record = FastaRecord::default();
  reader.read(&mut record)?;
  Ok(record.seq)
}

pub type FastaBufFileWriter = FastaWriter<BufWriter<File>>;

pub fn write_translations(
  seq_name: &str,
  translations: &[Result<Translation, Report>],
  gene_fasta_writers: &mut HashMap<String, FastaBufFileWriter>,
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

fn main() -> Result<(), Box<dyn Error>> {
  let ref_path = "data_dev/reference.fasta";
  let qry_path = "data_dev/sequences.fasta";
  let gene_map_path = "data_dev/genemap.gff";
  let out_path = "tmp/sequences2.aligned.fasta";

  let params = AlignPairwiseParams::default();

  trace!("Ref   : {ref_path}");
  trace!("Qry   : {qry_path}");
  trace!("Out   : {out_path}");
  trace!("Params:\n{params:#?}");

  trace!("Reading ref sequence from '{ref_path}'");
  let ref_seq = to_nuc_seq(&read_one_fasta(ref_path)?)?;

  trace!("Reading gene map from '{gene_map_path}'");
  let gene_map = read_gff3_file(&gene_map_path)?;

  trace!("Creating fasta reader from file '{qry_path}'");
  let mut reader = FastaReader::new(BufReader::with_capacity(32 * 1024, File::open(qry_path)?));
  let mut record = FastaRecord::default();

  trace!("Creating fasta writer to file '{out_path}'");
  ensure_dir(out_path)?;
  let mut writer = FastaWriter::new(BufWriter::with_capacity(32 * 1024, File::create(out_path)?));

  let mut gene_fasta_writers = gene_map
    .iter()
    .map(|(gene_name, _)| -> Result<_, Report> {
      let out_gene_fasta_path = format!("tmp/nextalign.gene.{gene_name}_new.fasta");
      trace!("Creating fasta writer to file '{out_gene_fasta_path}'");
      ensure_dir(&out_gene_fasta_path)?;
      let writer = FastaWriter::new(BufWriter::with_capacity(32 * 1024, File::create(&out_gene_fasta_path)?));
      Ok((gene_name.to_owned(), writer))
    })
    .collect::<Result<HashMap<String, FastaBufFileWriter>, Report>>()?;

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

    trace!("Reading sequence  '{}'", &record.seq_name);
    let qry_seq = to_nuc_seq(&record.seq)?;

    trace!("Aligning sequence '{}'", &record.seq_name);
    match align_nuc(&qry_seq, &ref_seq, &gap_open_close_nuc, &params) {
      Err(report) => {
        warn!(
          "Unable to align sequence '{}': {}",
          &record.seq_name,
          report_to_string(&report)
        );
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
