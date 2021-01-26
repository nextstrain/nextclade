#include <benchmark/benchmark.h>

#include "utils/getData.h"

const auto [sequences, reference, geneMap, totalNucs] = getData();

// clang-format off
#include "Nextalign.benchmark.h"
#include "AlignPairwise.benchmark.h"
//#include "SeedMatching.benchmark.h"
//#include "ForwardTrace.benchmark.h"
//#include "BackwardTrace.benchmark.h"
//#include "StripInsertions.benchmark.h"
// clang-format on


BENCHMARK_MAIN();
