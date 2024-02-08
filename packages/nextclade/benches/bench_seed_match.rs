use criterion::{black_box, criterion_group, criterion_main, Criterion, Throughput};
use nextclade::align::seed_match::seed_match;
use nextclade::alphabet::nuc::to_nuc_seq;

pub fn bench_seed_match(c: &mut Criterion) {
  let kmer = black_box(to_nuc_seq("ACG").unwrap());
  let ref_seq = black_box(to_nuc_seq("AAAAAAACGAAAAA").unwrap());
  let mismatches_allowed = black_box(0);
  let start_pos = black_box(0);

  let mut group = c.benchmark_group("seed_match");
  group.throughput(Throughput::Bytes(ref_seq.len() as u64));
  group.bench_function("seed_match", |b| {
    b.iter(|| {
      seed_match(&kmer, &ref_seq, start_pos, ref_seq.len(), mismatches_allowed);
    });
  });
  group.finish();
}

criterion_group!(benches, bench_seed_match);
criterion_main!(benches);
