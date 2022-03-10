use color_eyre::{Section, SectionExt};
use ctor::ctor;
use eyre::{Report, WrapErr};
use log::{trace, warn};
use nextclade::align::align::{align_nuc, AlignPairwiseParams};
use nextclade::align::backtrace::NextalignResult;
use nextclade::align::gap_open::get_gap_open_close_scores_codon_aware;
use nextclade::align::strip_insertions::strip_insertions;
use nextclade::io::fasta::{FastaReader, FastaRecord, FastaWriter};
use nextclade::io::fs::ensure_dir;
use nextclade::io::gff3::read_gff3_file;
use nextclade::io::nuc::{from_nuc_seq, to_nuc_seq};
use nextclade::utils::error::report_to_string;
use nextclade::utils::global_init::global_init;
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

  trace!("Creating gap open scores");
  let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &params);

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
        let stripped = strip_insertions(&alignment.qry_seq, &alignment.ref_seq);

        let qry_aln = from_nuc_seq(&stripped.qry_seq);

        trace!("Writing sequence  '{}'", &record.seq_name);
        writer.write(&record.seq_name, &qry_aln)?;
      }
    }

    record.clear();
  }

  trace!("Success");
  Ok(())
}
