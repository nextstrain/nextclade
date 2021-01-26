#pragma once

#include <benchmark/benchmark.h>

inline void setCounters(benchmark::State& st, int nSeq) {
  // How many sequences can be processed per second
  st.counters["seq/s"] = benchmark::Counter(st.iterations() * nSeq, benchmark::Counter::kIsRate);

  // How many milliseconds it takes to process one sequence
  st.counters["ms/seq"] =
    benchmark::Counter(st.iterations() * nSeq / 1000.0, benchmark::Counter::kIsRate | benchmark::Counter::kInvert);
}
