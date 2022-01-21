use bio::io::fasta;
use bio::io::fasta::FastaRead;
use ctor::ctor;
use eyre::{eyre, Report};
use log::trace;
use nextclade::align::align::{align_nuc, AlignPairwiseParams};
use nextclade::align::gap_open::get_gap_open_close_scores_codon_aware;
use nextclade::gene::gene::Gene;
use nextclade::utils::global_init::global_init;
use std::collections::HashMap;
use std::error::Error;

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
}

pub fn read_one_fasta(filepath: &str) -> Result<Vec<u8>, Report> {
  let mut reader = fasta::Reader::from_file(filepath).map_err(|err| eyre!(err))?;
  let mut record = fasta::Record::new();
  reader.read(&mut record)?;
  Ok(Vec::<u8>::from(record.seq()))
}

fn main() -> Result<(), Box<dyn Error>> {
  let ref_path = "../../data_dev/reference.fasta";
  let qry_path = "../../data_dev/sequences.fasta";
  let out_path = "../../tmp/sequences.aligned.fasta";

  let params = AlignPairwiseParams {
    min_length: 100,
    penaltyGapExtend: 0,
    penaltyGapOpen: 6,
    penaltyGapOpenInFrame: 7,
    penaltyGapOpenOutOfFrame: 8,
    penaltyMismatch: 1,
    scoreMatch: 3,
    maxIndel: 400,
    seedLength: 21,
    minSeeds: 10,
    seedSpacing: 100,
    mismatchesAllowed: 3,
    translatePastStop: false,
  };

  trace!("Ref   : {ref_path}");
  trace!("Qry   : {qry_path}");
  trace!("Out   : {out_path}");
  trace!("Params:\n{params:#?}");

  trace!("Reading ref sequence from {ref_path}");
  let ref_seq = &read_one_fasta(ref_path)?;

  trace!("Creating fasta reader");
  let mut reader = fasta::Reader::from_file(qry_path)?;
  let mut writer = fasta::Writer::to_file(out_path)?;
  let mut record = fasta::Record::new();

  let gene_map = HashMap::<String, Gene>::new();

  trace!("Creating gap open scores");
  let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(ref_seq, &gene_map, &params);

  trace!("Starting main loop");
  while let Ok(()) = reader.read(&mut record) {
    if record.is_empty() {
      break;
    }

    trace!("Reading sequence  '{}'", &record.id());
    let qry_seq: &[u8] = record.seq();

    trace!("Aligning sequence '{}'", &record.id());
    align_nuc(qry_seq, ref_seq, &gap_open_close_nuc, &params)?;

    trace!("Writing sequence  '{}'", &record.id());
    writer.write(record.id(), record.desc(), qry_seq)?;
  }

  trace!("Success");
  Ok(())
}
