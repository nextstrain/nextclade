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

template<typename Letter>
struct AlignmentStatus {
  Status status;
    std::optional<std::string> error;
  std::optional<AlignmentResult<Letter>> result;
};

using NucleotideAlignmentStatus = AlignmentStatus<Nucleotide>;
using AminoacidAlignmentStatus = AlignmentStatus<Aminoacid>;

struct SeedMatch {
  int shift;
  int score;
};

struct SeedAlignment {
  int meanShift;
  int bandWidth;
};

struct SeedAlignmentStatus {
  Status status;
  std::optional<std::string> error;
  std::optional<SeedAlignment> result;
};

struct ForwardTrace {
  vector2d<int> scores;
  vector2d<int> paths;
};

template<typename Letter>
SeedAlignmentStatus seedAlignment(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const NextalignSeedOptions& options);

template<typename Letter>
ForwardTrace scoreMatrix(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const std::vector<int>& gapOpenClose, int bandWidth, int meanShift,
  const NextalignAlignmentOptions& alignmentOptions);

template<typename Letter>
AlignmentStatus<Letter> backTrace(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const vector2d<int>& scores, const vector2d<int>& paths, int meanShift);

NucleotideAlignmentStatus alignPairwise(const NucleotideSequence& query, const NucleotideSequence& ref,
  const std::vector<int>& gapOpenClose, const NextalignAlignmentOptions& alignmentOptions,
  const NextalignSeedOptions& seedOptions);

AminoacidAlignmentStatus alignPairwise(const AminoacidSequence& query, const AminoacidSequence& ref,
  const std::vector<int>& gapOpenClose, const NextalignAlignmentOptions& alignmentOptions,
  const NextalignSeedOptions& seedOptions);
