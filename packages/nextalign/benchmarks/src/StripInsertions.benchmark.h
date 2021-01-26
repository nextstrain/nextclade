#pragma once

#include <benchmark/benchmark.h>

#include <numeric>
#include <vector>

#include "../include/nextalign/nextalign.h"
#include "../src/align/alignPairwise.h"
#include "../src/strip/stripInsertions.h"
#include "utils/getData.h"
#include "utils/setCounters.h"


class StripInsertionsBench : public benchmark::Fixture {
protected:
  std::vector<Alignment> alignments;

  StripInsertionsBench() {
    const auto n = NUM_SEQUENCES_AVG;
    alignments.resize(n);
    for (int i = 0; i < n; ++i) {
      const auto& input = sequences[i];
      alignments[i] = alignPairwise(input.seq, reference, &lookupNucMatchScore, 100);
    }
  }
};


BENCHMARK_DEFINE_F(StripInsertionsBench, Average)(benchmark::State& st) {
  const auto n = NUM_SEQUENCES_AVG;
  StripInsertionsResult result;
  st.SetComplexityN(totalNucs);

  for (const auto _ : st) {
    for (int i = 0; i < n; ++i) {
      const auto& input = sequences[i];
      const auto& seedAlignment = alignments[i];
      benchmark::DoNotOptimize(result = stripInsertions(reference, input.seq));
    }
  }

  setCounters(st, n);
}


BENCHMARK_REGISTER_F(StripInsertionsBench, Average)
  ->Unit(benchmark::kMillisecond)//
  ->Complexity(benchmark::oNSquared)
  ->Iterations(20);


BENCHMARK_DEFINE_F(StripInsertionsBench, Variation)(benchmark::State& st) {
  const auto& index = st.range(0);
  const auto& input = sequences[index];
  StripInsertionsResult result;
  st.SetLabel(input.seqName);
  st.SetComplexityN(input.seq.size());

  for (const auto _ : st) {
    benchmark::DoNotOptimize(result = stripInsertions(reference, input.seq));
  }

  setCounters(st, 1);
}

BENCHMARK_REGISTER_F(StripInsertionsBench, Variation)
  ->DenseRange(0, NUM_SEQUENCES_VAR - 1, 1)//
  ->Unit(benchmark::kMillisecond)          //
  ->Complexity(benchmark::oNSquared);
