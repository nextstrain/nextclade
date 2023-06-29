use std::fs;
use std::path::PathBuf;

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use nextclade::align::params::AlignPairwiseParams;
use nextclade::align::seed_alignment::seed_alignment;
use nextclade::alphabet::nuc::to_nuc_seq;
use nextclade::io::gene_map::GeneMap;

pub fn bench_seed_alignment(c: &mut Criterion) {
  let params = AlignPairwiseParams::default();
  let gene_map = GeneMap::new();

  let test_data_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("test_data");
  let ref_path = test_data_dir.join("reference.fasta");
  let qry_path = test_data_dir.join("Hangzhou_ZJU_07_2020.fasta");

  let ref_seq = sequence_from_path(ref_path);
  let qry_seq = sequence_from_path(qry_path);

  let mut group = c.benchmark_group("seed_alignment");
  group.bench_function("seed_match", |b| {
    b.iter(|| {
      seed_alignment(&qry_seq, &ref_seq, &params).unwrap();
    });
  });
  group.finish();
}

fn sequence_from_path(path: PathBuf) -> Vec<nextclade::alphabet::nuc::Nuc> {
  black_box(to_nuc_seq(fs::read_to_string(path).unwrap().trim()).unwrap())
}

criterion_group!(benches, bench_seed_alignment);
criterion_main!(benches);
