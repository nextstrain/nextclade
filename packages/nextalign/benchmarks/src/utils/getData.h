#pragma once

#include <algorithm>
#include <cassert>
#include <fstream>
#include <numeric>
#include <vector>

#include "../include/nextalign/nextalign.h"

constexpr const int NUM_SEQUENCES_AVG = 30;// Number of sequences to process per "Average" benchmark
constexpr const int NUM_SEQUENCES_VAR = 10;// Number of sequences to process per "Variation" benchmark

auto getData() {
  std::vector<AlgorithmInput> sequences;
  std::ifstream fastaFile("data/example/sequences.fasta");
  const auto sequencesMap = parseSequences(fastaFile);
  std::copy(sequencesMap.cbegin(), sequencesMap.cend(), back_inserter(sequences));

  assert(sequences.size() >= NUM_SEQUENCES_VAR);
  const auto totalNucs = std::accumulate(
    sequences.cbegin(), sequences.cbegin() + NUM_SEQUENCES_VAR, 0, [](int total, const AlgorithmInput& input) {
      total += input.seq.size();
      return total;
    });

  std::ifstream refFile("data/example/reference.txt");
  const auto refSeqs = parseSequences(refFile);
  const auto ref = refSeqs.begin()->seq;

  std::ifstream genemapFile("data/example/genemap.gff");
  const auto geneMap = parseGeneMapGff(genemapFile);

  return std::make_tuple(sequences, ref, geneMap, totalNucs);
}
