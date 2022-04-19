use ctor::ctor;
use eyre::Report;
use nextclade::align::align::{align_nuc, AlignPairwiseParams};
use nextclade::align::gap_open::{get_gap_open_close_scores_codon_aware, GapScoreMap};
use nextclade::gene::gene_map::GeneMap;
use nextclade::io::fasta::read_one_fasta_nuc_seq;
use nextclade::io::nuc::{from_nuc_seq, Nuc};
use nextclade::utils::global_init::global_init;
use pretty_assertions::assert_eq;
use rstest::{fixture, rstest};

#[ctor]
fn init() {
  global_init();
}

struct Context {
  ref_seq: Vec<Nuc>,
  params: AlignPairwiseParams,
  gap_open_close: GapScoreMap,
}

impl Context {
  pub fn new() -> Result<Self, Report> {
    let ref_seq = read_one_fasta_nuc_seq("test_data/reference.fasta").unwrap();
    let params = AlignPairwiseParams::default();
    let gene_map = GeneMap::new();
    let gap_open_close = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &params);
    Ok(Context {
      ref_seq,
      params,
      gap_open_close,
    })
  }
}

#[fixture]
fn ctx() -> Context {
  Context::new().unwrap()
}

#[rstest]
fn aligns_real_large_sc2_qry_insertion_at_start(ctx: Context) -> Result<(), Report> {
  let qry_seq = read_one_fasta_nuc_seq("test_data/Hangzhou_ZJU_07_2020.fasta")?;
  let qry_aln = read_one_fasta_nuc_seq("test_data/Hangzhou_ZJU_07_2020_qry_aligned.fasta")?;
  let result = align_nuc(&qry_seq, &ctx.ref_seq, &ctx.gap_open_close, &ctx.params)?;
  assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
  assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
  Ok(())
}
