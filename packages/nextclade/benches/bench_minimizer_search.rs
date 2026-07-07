use std::collections::HashMap;
use std::hint::black_box;

use criterion::{Criterion, criterion_group, criterion_main};
use nextclade::io::fasta::FastaRecord;
use nextclade::sort::minimizer_index::{MinimizerIndexJson, MinimizerIndexParams, MinimizerIndexRefInfo, MinimizerMap};
use nextclade::sort::minimizer_search::{get_ref_search_minimizers, run_minimizer_search};
use nextclade::sort::params::NextcladeSeqSortParams;
use serde_json::Value;

// Attribution benchmark for the dataset-suggestion minimizer search.
//
// Isolates the per-query search cost (`run_minimizer_search`) from CLI startup and IO, and
// attributes the runtime of the wider-cutoff scenario to concrete code paths:
//
//   - `hash`   : `get_ref_search_minimizers` only  (k-mer hashing + cutoff filter + dedup)
//   - `search` : full `run_minimizer_search`        (hashing + map lookups + hit counting)
//
// The `search - hash` difference is the map-lookup + hit-count cost.
//
// The `c28` / `c31` suffixes vary only the global `params.cutoff` (1<<28 vs 1<<31) over one index
// that is always built at cutoff 1<<28 -- exactly the situation a per-dataset cutoff creates: one
// dataset raises the global cutoff, so every query hashes and looks up ~8x more k-mers while the
// stored index barely grows. Data is generated deterministically in-code so the benchmark is
// self-contained and reproducible.
//
// `lookup_btree_c31` vs `lookup_hashmap_c31` isolates the map-lookup cost of the extra (mostly
// missing) c31 query k-mers, comparing the on-disk `BTreeMap` against a `HashMap` view.

const K: usize = 17;
const CUTOFF_28: i64 = 1 << 28;
const CUTOFF_31: i64 = 1 << 31;
const N_REFS: usize = 100;
const REF_LEN: usize = 2000;
const N_QUERIES: usize = 60;
const QRY_LEN: usize = 4000;

pub fn bench_minimizer_search(c: &mut Criterion) {
  let params = NextcladeSeqSortParams::default();
  let queries = make_queries();

  let index_c28 = build_index(CUTOFF_28);
  let index_c31 = build_index(CUTOFF_31);

  let mut group = c.benchmark_group("minimizer_search");

  group.bench_function("hash_c28", |b| {
    b.iter(|| {
      for q in &queries {
        black_box(get_ref_search_minimizers(q, &index_c28.params));
      }
    });
  });

  group.bench_function("hash_c31", |b| {
    b.iter(|| {
      for q in &queries {
        black_box(get_ref_search_minimizers(q, &index_c31.params));
      }
    });
  });

  group.bench_function("search_c28", |b| {
    b.iter(|| {
      for q in &queries {
        black_box(run_minimizer_search(q, &index_c28, &params).unwrap());
      }
    });
  });

  group.bench_function("search_c31", |b| {
    b.iter(|| {
      for q in &queries {
        black_box(run_minimizer_search(q, &index_c31, &params).unwrap());
      }
    });
  });

  let mzs_per_query: Vec<Vec<u64>> = queries
    .iter()
    .map(|q| get_ref_search_minimizers(q, &index_c31.params))
    .collect();
  let btree = &index_c31.minimizers;
  let hashmap: HashMap<u64, Vec<usize>> = btree.iter().map(|(k, v)| (*k, v.clone())).collect();

  group.bench_function("lookup_btree_c31", |b| {
    b.iter(|| black_box(count_hits(&mzs_per_query, |m| btree.get(m).map(Vec::as_slice))));
  });

  group.bench_function("lookup_hashmap_c31", |b| {
    b.iter(|| black_box(count_hits(&mzs_per_query, |m| hashmap.get(m).map(Vec::as_slice))));
  });

  group.finish();
}

// Count per-reference hits over precomputed query minimizer streams, using the provided lookup.
fn count_hits<'a>(mzs_per_query: &[Vec<u64>], lookup: impl Fn(&u64) -> Option<&'a [usize]>) -> u64 {
  let mut total = 0;
  for mzs in mzs_per_query {
    let mut hit_counts = vec![0_u64; N_REFS];
    for m in mzs {
      if let Some(mz) = lookup(m) {
        for &ri in mz {
          if let Some(hc) = hit_counts.get_mut(ri) {
            *hc += 1;
          }
        }
      }
    }
    total += hit_counts.iter().sum::<u64>();
  }
  total
}

// Index built at cutoff 1<<28 from `N_REFS` deterministic reference sequences; `params.cutoff` is set
// to `cutoff` to model the global client cutoff independently of the stored index.
fn build_index(cutoff: i64) -> MinimizerIndexJson {
  let build_params = MinimizerIndexParams {
    k: K as i64,
    cutoff: CUTOFF_28,
    other: Value::Null,
  };

  let mut minimizers = MinimizerMap::new();
  let mut references = Vec::with_capacity(N_REFS);
  for ri in 0..N_REFS {
    let seq = make_seq(REF_LEN, 0x51ED_270B_u64.wrapping_add(ri as u64));
    let record = FastaRecord {
      seq_name: format!("ref{ri}"),
      seq,
      index: ri,
    };
    let mzs = get_ref_search_minimizers(&record, &build_params);
    for m in &mzs {
      minimizers.entry(*m).or_default().push(ri);
    }
    #[allow(deprecated)] // `n_minimizers` is a required struct field; scoring uses `expected_minimizer_hits`
    references.push(MinimizerIndexRefInfo {
      length: REF_LEN as i64,
      name: format!("ref{ri}"),
      n_minimizers: mzs.len() as i64,
      expected_minimizer_hits: Some(mzs.len() as f64),
      other: Value::Null,
    });
  }

  MinimizerIndexJson {
    schema: String::new(),
    schema_version: "3.0.0".to_owned(),
    version: "1".to_owned(),
    params: MinimizerIndexParams {
      k: K as i64,
      cutoff,
      other: Value::Null,
    },
    minimizers,
    references,
    normalization: vec![],
    other: Value::Null,
  }
}

// Queries overlap the reference seeds (guaranteeing real hits) but are longer and use different
// seeds for the tail, producing both hits and misses like a real mixed query set.
fn make_queries() -> Vec<FastaRecord> {
  (0..N_QUERIES)
    .map(|qi| FastaRecord {
      seq_name: format!("q{qi}"),
      seq: make_seq(QRY_LEN, 0x51ED_270B_u64.wrapping_add((qi % N_REFS) as u64)),
      index: qi,
    })
    .collect()
}

// Deterministic pseudo-random ACGT sequence via a linear congruential generator.
fn make_seq(n: usize, seed: u64) -> String {
  let bases = [b'A', b'C', b'G', b'T'];
  let mut x = seed ^ 0x2545_F491_4F6C_DD1D;
  std::iter::repeat_with(|| {
    x = x.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1);
    bases[((x >> 33) & 3) as usize] as char
  })
  .take(n)
  .collect()
}

criterion_group!(benches, bench_minimizer_search);
criterion_main!(benches);
