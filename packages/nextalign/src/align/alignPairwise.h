#pragma once

#include <nextalign/nextalign.h>

#include <string>
#include <vector>

#include "../alphabet/aminoacids.h"
#include "../alphabet/nucleotides.h"
#include "../utils/vector2d.h"

struct NextalignOptions;

template<typename Letter>
struct AlignmentResult {
  Sequence<Letter> query;
  Sequence<Letter> ref;
  int alignmentScore;
};

using NucleotideAlignmentResult = AlignmentResult<Nucleotide>;

using AminoacidAlignmentResult = AlignmentResult<Aminoacid>;


struct SeedMatch {
  int shift;
  int score;
};

struct SeedAlignment {
  int meanShift;
  int bandWidth;
};

struct ForwardTrace {
  vector2d<int> scores;
  vector2d<int> paths;
};

template<typename Letter>
SeedAlignment seedAlignment(
  const Sequence<Letter>& query, const Sequence<Letter>& ref, const NextalignSeedOptions& options);

template<typename Letter>
ForwardTrace scoreMatrix(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const std::vector<int>& gapOpenClose, int bandWidth, int meanShift,
  const NextalignAlignmentOptions& alignmentOptions);

template<typename Letter>
AlignmentResult<Letter> backTrace(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const vector2d<int>& scores, const vector2d<int>& paths, int meanShift);

NucleotideAlignmentResult alignPairwise(const NucleotideSequence& query, const NucleotideSequence& ref,
  const std::vector<int>& gapOpenClose, const NextalignAlignmentOptions& alignmentOptions,
  const NextalignSeedOptions& seedOptions);

AminoacidAlignmentResult alignPairwise(const AminoacidSequence& query, const AminoacidSequence& ref,
  const std::vector<int>& gapOpenClose, const NextalignAlignmentOptions& alignmentOptions,
  const NextalignSeedOptions& seedOptions);
