#include "alignPairwise.h"

#include <fmt/format.h>

#include <cmath>
#include <iostream>
#include <string>
#include <vector>

#include "../match/matchAa.h"
#include "../match/matchNuc.h"
#include "../utils/debug_trace.h"
#include "../utils/safe_cast.h"


namespace details {
  inline int round(double x) {
    return safe_cast<int>(std::round(x));
  }
}// namespace details


// store direction info for backtrace as bits in paths matrix
// these indicate the currently optimal move
constexpr const int MATCH = 1 << 0;
constexpr const int refGAPmatrix = 1 << 1;
constexpr const int qryGAPmatrix = 1 << 2;
// these are the override flags for gap extension
constexpr const int refGAPextend = 1 << 3;
constexpr const int qryGAPextend = 1 << 4;
constexpr const int END_OF_SEQUENCE = -1;

// determine the position where a particular kmer (string of length k) matches the reference sequence
// TODO: this function accepts a start position and will not search for matches before this position.
// This start position is set by the previous match. It is thus sensitive to a seed matching in the wrong
// part of the sequence and is thus likely to produce errors for genomes with repeated sequence
template<typename Letter>
SeedMatch seedMatch(const Sequence<Letter>& kmer, const Sequence<Letter>& ref, const int start_pos,
  const int mismatchesAllowed) {
  const int refSize = safe_cast<int>(ref.size());
  const int kmerSize = safe_cast<int>(kmer.size());
  int tmpScore = 0;
  int maxScore = 0;
  int maxShift = -1;
  for (int shift = start_pos; shift < refSize - kmerSize; ++shift) {
    tmpScore = 0;
    for (int pos = 0; pos < kmerSize; ++pos) {
      if (kmer[pos] == ref[shift + pos]) {
        tmpScore++;
      }
      // TODO: this speeds up seed-matching by disregarding bad seeds.
      if (tmpScore + mismatchesAllowed < pos) {
        break;
      }
    }
    if (tmpScore > maxScore) {
      maxScore = tmpScore;
      maxShift = shift;
      // if maximal score is reached
      if (tmpScore == kmerSize) {
        break;
      }
    }
  }
  return {.shift = maxShift, .score = maxScore};
}


template<typename Letter>
inline bool isBadLetter(Letter letter);

template<>
[[maybe_unused]] inline bool isBadLetter(Nucleotide letter) {
  return letter == Nucleotide::N;
}

template<>
[[maybe_unused]] inline bool isBadLetter(Aminoacid letter) {
  return letter == Aminoacid::X;
}

template<typename Letter>
std::vector<int> getMapToGoodPositions(const Sequence<Letter>& query, int seedLength) {
  const int querySize = safe_cast<int>(query.size());

  std::vector<int> mapToGoodPositions;
  mapToGoodPositions.reserve(querySize);
  int distanceToLastBadPos = 0;
  for (int i = 0; i < querySize; i++) {
    if (isBadLetter(query[i])) {
      distanceToLastBadPos = -1;
    } else if (distanceToLastBadPos > seedLength) {
      mapToGoodPositions.push_back(i - seedLength);
    }
    distanceToLastBadPos++;
  }

  return mapToGoodPositions;
}


template<typename Letter>
SeedAlignmentStatus seedAlignment(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const NextalignSeedOptions& options) {
  const int querySize = safe_cast<int>(query.size());
  const int refSize = safe_cast<int>(ref.size());

  // clang-format off
  const int nSeeds = refSize > options.minSeeds * options.seedSpacing ? refSize / options.seedSpacing : options.minSeeds;
  const int margin = details::round(refSize / (nSeeds * 3.0));
  const int bandWidth = details::round((refSize + querySize) * 0.5) - 3;
  // clang-format on

  debug_trace("Seed alignment: started: querySize={:}, refSize={:}, nSeeds={:}, margin={:}, bandWidth={:}\n", querySize,
    refSize, nSeeds, margin, bandWidth);

  int start_pos = 0;
  if (bandWidth < 2 * options.seedLength) {
    const auto meanShift = details::round((refSize - querySize) * 0.5);
    debug_trace(
      "Seed alignment succeeded: the condition `bandWidth < 2 * options.seedLength` is fulfilled: bandWidth={:}, "
      "meanShift={:}, options.seedLength={:}\n",
      bandWidth, meanShift, options.seedLength);
    return SeedAlignmentStatus{
      .status = Status::Success,
      .error = {},
      .result = std::make_optional<SeedAlignment>({
        .meanShift = meanShift,// NOLINT: cppcoreguidelines-avoid-magic-numbers
        .bandWidth = bandWidth //
      }),
    };
  }

  const auto mapToGoodPositions = getMapToGoodPositions(query, options.seedLength);
  const int nGoodPositions = safe_cast<int>(mapToGoodPositions.size());

  // TODO: Maybe use something other than array? A struct with named fields to make
  //  the code in the end of the function less confusing?
  using Clamp = std::array<int, 4>;
  std::vector<Clamp> seedMatches;
  // generate kmers equally spaced on the query
  const auto seedCover = safe_cast<double>(nGoodPositions - 2 * margin);
  const double kmerSpacing = (seedCover - 1.0) / (nSeeds - 1.0);

  if (seedCover < 0.0 || kmerSpacing < 0.0) {
    debug_trace("Seed alignment: failed: No seed matches: seedCover={:}, kmerSpacing={:}. Aborting.\n", seedCover,
      kmerSpacing);
    return SeedAlignmentStatus{
      .status = Status::Error,
      .error = "Unable to align: no seed matches",
      .result = std::optional<SeedAlignment>(),
    };
  }

  for (int ni = 0; ni < nSeeds; ++ni) {

    const auto goodPositionIndex = details::round(margin + (kmerSpacing * ni));
    invariant_less(goodPositionIndex, mapToGoodPositions.size());
    const int qPos = mapToGoodPositions[goodPositionIndex];
    // FIXME: query.substr() creates a new string. Use string view instead.
    const auto seed = query.substr(qPos, options.seedLength);
    const auto tmpMatch = seedMatch(seed, ref, start_pos, options.mismatchesAllowed);

    // only use seeds with at most allowed_mismatches
    if (tmpMatch.score >= options.seedLength - options.mismatchesAllowed) {
      seedMatches.push_back({qPos, tmpMatch.shift, tmpMatch.shift - qPos, tmpMatch.score});
      start_pos = tmpMatch.shift;
    }
  }

  debug_trace("Seed matches:\n{:}\n", seedMatches);

  if (seedMatches.size() < 2) {
    debug_trace("Seed alignment: failed: No seed matches: seedMatches.size={:}, which is less than 2. Aborting.\n",
      seedMatches.size());
    return SeedAlignmentStatus{
      .status = Status::Error,
      .error = "Unable to align: no seed matches",
      .result = std::optional<SeedAlignment>(),
    };
  }

  // given the seed matches, determine the maximal and minimal shifts
  // this shift is the typical amount the query needs shifting to match ref
  // ref:   ACTCTACTGC-TCAGAC
  // query: ----TCACTCATCT-ACACCGAT  => shift = 4, then 3, 4 again

  int minShift = refSize;
  int maxShift = -refSize;
  for (auto& seedMatch : seedMatches) {
    if (seedMatch[2] < minShift) {
      minShift = seedMatch[2];
    }
    if (seedMatch[2] > maxShift) {
      maxShift = seedMatch[2];
    }
  }

  debug_trace("Seed alignment: minShift={:}, maxShift={:}\n", minShift, maxShift);

  const int meanShift = details::round(0.5 * (minShift + maxShift));
  const int bandWidthFinal = maxShift - minShift + 9;

  debug_trace("Seed alignment succeeded: bandWidth={:}, meanShift={:}\n", bandWidthFinal, meanShift);
  return SeedAlignmentStatus{
    .status = Status::Success,
    .error = {},
    .result = std::make_optional<SeedAlignment>({.meanShift = meanShift, .bandWidth = bandWidthFinal}),
  };
}

template<typename Letter>
ForwardTrace scoreMatrix(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const std::vector<int>& gapOpenClose, int bandWidth, int meanShift,
  const NextalignAlignmentOptions& alignmentOptions) {
  // allocate a matrix to record the matches
  const int querySize = safe_cast<int>(query.size());
  const int refSize = safe_cast<int>(ref.size());
  const int n_rows = bandWidth * 2 + 1;
  const int n_cols = refSize + 1;

  debug_trace(
    "Score matrix: stared: querySize={:}, refSize={:}, bandWidth={:}, meanShift={:}, n_rows={:}, n_cols={:}\n",
    querySize, refSize, bandWidth, meanShift, n_rows, n_cols);

  vector2d<int> paths(n_rows, n_cols);
  // TODO: these could be reduced to vectors
  vector2d<int> scores(n_rows, n_cols);
  std::vector<int> qryGaps(n_rows);


  // fill scores with alignment scores
  // The inner index scores[][ri] is the index of the reference sequence
  // the outer index si index the shift, together they define rPos=ri and qPos = ri-shift
  // if the colon marks the position in the sequence before rPos,qPos
  // R: ...ACT:X
  // Q: ...ACT:Y
  // 1) if X and Y are bases they either match or mismatch. shift doesn't change, rPos and qPos advance
  //    -> right horizontal step in the matrix
  // 2) if X is '-' and Y is a base, rPos stays the same and the shift decreases
  //    -> vertical step in the matrix from si+1 to si
  // 2) if X is a base and Y is '-', rPos advances the same and the shift increases
  //    -> diagonal step in the matrix from (ri,si-1) to (ri+1,si)
  const auto NO_ALIGN = -(alignmentOptions.scoreMatch + alignmentOptions.penaltyMismatch) * refSize;

  for (int si = 2 * bandWidth; si > bandWidth; si--) {
    paths(si, 0) = qryGAPmatrix;
  }
  paths(bandWidth, 0) = MATCH;
  qryGaps[bandWidth] = -alignmentOptions.penaltyGapOpen;
  for (int si = bandWidth - 1; si >= 0; si--) {
    paths(si, 0) = refGAPmatrix;
    qryGaps[si] = -alignmentOptions.penaltyGapOpen;
  }
  for (int ri = 0; ri < refSize; ri++) {
    int qPos = ri - (bandWidth + meanShift);
    int refGaps = -gapOpenClose[ri];
    for (int si = 2 * bandWidth; si >= 0; si--) {
      int tmpPath = 0, score = 0, origin = 0;
      int qGapExtend = 0, rGapExtend = 0, rGapOpen = 0, qGapOpen = 0;
      int tmpMatch = 0, tmpScore = 0;
      if (qPos < 0) {
        // precedes query sequence -- no score, origin is query gap
        // we could fill all of this at once
        score = 0;
        tmpPath += qryGAPextend;
        refGaps = -gapOpenClose[ri];
        origin = qryGAPmatrix;
      } else if (qPos < querySize) {
        // if the shifted position is within the query sequence

        // no gap -- match case
        tmpMatch =
          lookupMatchScore(query[qPos], ref[ri]) > 0 ? alignmentOptions.scoreMatch : -alignmentOptions.penaltyMismatch;
        score = scores(si, ri) + tmpMatch;
        origin = MATCH;

        // check the scores of a reference gap
        if (si < 2 * bandWidth) {
          rGapExtend = refGaps - alignmentOptions.penaltyGapExtend;
          rGapOpen = scores(si + 1, ri + 1) - gapOpenClose[ri + 1];
          if (rGapExtend > rGapOpen) {
            tmpScore = rGapExtend;
            tmpPath += refGAPextend;
          } else {
            tmpScore = rGapOpen;
          }
          refGaps = tmpScore;
          if (score < tmpScore) {
            score = tmpScore;
            origin = refGAPmatrix;
          }
        } else {
          refGaps = NO_ALIGN;
        }

        // check the scores of a reference gap
        if (si > 0) {
          qGapExtend = qryGaps[si - 1] - alignmentOptions.penaltyGapExtend;
          qGapOpen = scores(si - 1, ri) - gapOpenClose[ri];
          tmpScore = qGapExtend > qGapOpen ? qGapExtend : qGapOpen;
          if (qGapExtend > qGapOpen) {
            tmpScore = qGapExtend;
            tmpPath += qryGAPextend;
          } else {
            tmpScore = qGapOpen;
          }
          qryGaps[si] = tmpScore;
          if (score < tmpScore) {
            score = tmpScore;
            origin = qryGAPmatrix;
          }
        } else {
          qryGaps[si] = NO_ALIGN;
        }
      } else {
        // past query sequence -- mark as sequence end
        score = END_OF_SEQUENCE;
        origin = END_OF_SEQUENCE;
      }
      tmpPath += origin;
      paths(si, ri + 1) = tmpPath;
      scores(si, ri + 1) = score;
      qPos++;
    }
    // std::cout <<"\n";
  }

  debug_trace(
    "Score matrix: succeeded: scores.num_rows={:}, scores.num_cols={:}, paths.num_rows={:}, paths.num_cols={:}\n",
    scores.num_rows(), scores.num_cols(), paths.num_rows(), paths.num_cols());

  return {.scores = scores, .paths = paths};
}

template<typename Letter>
AlignmentStatus<Letter> backTrace(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const vector2d<int>& scores, const vector2d<int>& paths, int meanShift) {
  const int rowLength = safe_cast<int>(scores.num_cols());
  const int scoresSize = safe_cast<int>(scores.num_rows());
  const int querySize = safe_cast<int>(query.size());
  const int refSize = safe_cast<int>(ref.size());
  const int bandWidth = (scoresSize - 1) / 2;
  int currentMatrix = 0;

  // TODO: Avoid creating this lambda function
  const auto indexToShift = [&bandWidth, &meanShift]//
    (int si) {                                      //
      return si - bandWidth + meanShift;
    };


  std::vector<std::pair<char, char>> aln;
  Sequence<Letter> aln_ref;
  Sequence<Letter> aln_query;
  aln_ref.reserve(rowLength + 3 * bandWidth);
  aln_query.reserve(rowLength + 3 * bandWidth);

  // const lastIndexByShift = scores.map((d, i) = > Math.min(rowLength - 1, querySize + indexToShift(i)));
  // const lastScoreByShift = scores.map((d, i) = > d[lastIndexByShift[i]]);


  std::vector<int> lastScoreByShift;
  std::vector<int> lastIndexByShift;
  lastScoreByShift.resize(scores.num_rows());
  lastIndexByShift.resize(scores.num_rows());

  // Determine the best alignment by picking the optimal score at the end of the query
  int si = 0;
  int bestScore = 0;
  debug_trace("backtrace: rowLength={:}, querySize={:}, scoresSize={:}\n", rowLength, querySize, scoresSize);
  for (int i = 0; i < scoresSize; i++) {
    const auto is = indexToShift(i);
    // Determine the last index
    lastIndexByShift[i] = std::min(rowLength - 1, querySize + is);

    if (lastIndexByShift[i] >= 0 && lastIndexByShift[i] < scoresSize) {
      lastScoreByShift[i] = scores(i, lastIndexByShift[i]);
      if (lastScoreByShift[i] > bestScore) {
        bestScore = lastScoreByShift[i];
        si = i;
      }
    }
  }

  const int shift = indexToShift(si);
  int origin;//NOLINT(cppcoreguidelines-init-variables)

  // determine position tuple qPos, rPos corresponding to the place it the matrix
  int rPos = lastIndexByShift[si] - 1;
  int qPos = rPos - shift;
  // add right overhang, i.e. unaligned parts of the query or reference the right end
  if (rPos < refSize - 1) {
    for (int ii = refSize - 1; ii > rPos; ii--) {
      aln_query += Letter::GAP;
      aln_ref += ref[ii];
    }
  } else if (qPos < querySize - 1) {
    for (int ii = querySize - 1; ii > qPos; ii--) {
      aln_query += query[ii];
      aln_ref += Letter::GAP;
    }
  }

  // do backtrace for aligned region
  while (rPos >= 0 && qPos >= 0) {
    origin = paths(si, rPos + 1);
    // std::cout<<si<<" "<<rPos<<" "<<origin<<" "<<currentMatrix<<"\n";
    if (origin & MATCH && currentMatrix == 0) {
      // match -- decrement both strands and add match to alignment
      aln_query += query[qPos];
      aln_ref += ref[rPos];
      qPos--;
      rPos--;
    } else if ((origin & refGAPmatrix && currentMatrix == 0) || currentMatrix == refGAPmatrix) {
      // insertion in ref -- decrement query, increase shift
      aln_query += query[qPos];
      aln_ref += Letter::GAP;
      qPos--;
      si++;
      if (origin & refGAPextend) {
        // remain in gap-extension mode and ignore best-overall score
        currentMatrix = refGAPmatrix;
      } else {
        // close gap, return to best-overall score
        currentMatrix = 0;
      }
    } else if ((origin & qryGAPmatrix && currentMatrix == 0) || currentMatrix == qryGAPmatrix) {
      // deletion in query -- decrement reference, reduce shift
      aln_query += Letter::GAP;
      aln_ref += ref[rPos];
      rPos--;
      si--;
      if (origin & qryGAPextend) {
        // remain in gap-extension mode and ignore best-overall score
        currentMatrix = qryGAPmatrix;
      } else {
        // close gap, return to best-overall score
        currentMatrix = 0;
      }
    } else {
      break;
    }
  }

  // add left overhang
  if (rPos >= 0) {
    for (int ii = rPos; ii >= 0; ii--) {
      aln_query += Letter::GAP;
      aln_ref += ref[ii];
    }
  } else if (qPos >= 0) {
    for (int ii = qPos; ii >= 0; ii--) {
      aln_query += query[ii];
      aln_ref += Letter::GAP;
    }
  }

  // TODO: shrink to fit

  std::reverse(aln_query.begin(), aln_query.end());
  std::reverse(aln_ref.begin(), aln_ref.end());

  return AlignmentStatus<Letter>{
    .status = Status::Success,
    .error = {},
    .result =
      AlignmentResult<Letter>{
        .query = aln_query,
        .ref = aln_ref,
        .alignmentScore = bestScore,
      },
  };
}

struct AlignPairwiseTag {};


template<typename Letter>
AlignmentStatus<Letter> alignPairwise(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const std::vector<int>& gapOpenClose, const NextalignAlignmentOptions& alignmentOptions,
  const NextalignSeedOptions& seedOptions, int bandWidth, int shift, AlignPairwiseTag) {

  debug_trace(
    "Align pairwise: started:\n  minimalLength={:},\n  penaltyGapExtend={:},\n  penaltyGapOpen={:},\n  "
    "penaltyGapOpenInFrame={:},\n  penaltyGapOpenOutOfFrame={:},\n  penaltyMismatch={:},\n  scoreMatch={:},\n  "
    "maxIndel={:},\n  seedLength={:},\n  minSeeds={:},\n  seedSpacing={:},\n  mismatchesAllowed={:}\n",
    alignmentOptions.minimalLength, alignmentOptions.penaltyGapExtend, alignmentOptions.penaltyGapOpen,
    alignmentOptions.penaltyGapOpenInFrame, alignmentOptions.penaltyGapOpenOutOfFrame, alignmentOptions.penaltyMismatch,
    alignmentOptions.scoreMatch, alignmentOptions.maxIndel, seedOptions.seedLength, seedOptions.minSeeds,
    seedOptions.seedSpacing, seedOptions.mismatchesAllowed);


  if (bandWidth > alignmentOptions.maxIndel) {
    debug_trace("Align pairwise: failed: `bandWidth > alignmentOptions.maxIndel`, where bandWidth={:}, maxIndel={:}\n",
      bandWidth, alignmentOptions.maxIndel);
    return AlignmentStatus<Letter>{
      .status = Status::Error,
      .error = "Unable to align: too many insertions, deletions, duplications, or ambiguous seed matches",
      .result = {},
    };
  }
  const ForwardTrace& forwardTrace = scoreMatrix(query, ref, gapOpenClose, bandWidth, shift, alignmentOptions);
  const auto& scores = forwardTrace.scores;
  const auto& paths = forwardTrace.paths;
  // debug_trace("Align pairwise: after score matrix: scores={:}, paths={:}\n", scores, paths);

  return backTrace<Letter>(query, ref, scores, paths, shift);
}


NucleotideAlignmentStatus alignPairwise(const NucleotideSequence& query, const NucleotideSequence& ref,
  const std::vector<int>& gapOpenClose, const NextalignAlignmentOptions& alignmentOptions,
  const NextalignSeedOptions& seedOptions) {

  const int querySize = safe_cast<int>(query.size());
  if (querySize < alignmentOptions.minimalLength) {
    return AlignmentStatus<Nucleotide>{
      .status = Status::Error,
      .error = "Unable to align: sequence is too short",
      .result = {},
    };
  }

  const SeedAlignmentStatus& seedAlignmentStatus = seedAlignment(query, ref, seedOptions);
  if (seedAlignmentStatus.status != Status::Success) {
    return AlignmentStatus<Nucleotide>{
      .status = seedAlignmentStatus.status,
      .error = seedAlignmentStatus.error,
      .result = {},
    };
  }

  const auto& bandWidth = seedAlignmentStatus.result->bandWidth;
  const auto& meanShift = seedAlignmentStatus.result->meanShift;
  debug_trace("Align pairwise: after seed alignment: bandWidth={:}, meanShift={:}\n", bandWidth, meanShift);

  return alignPairwise(query, ref, gapOpenClose, alignmentOptions, seedOptions, bandWidth, meanShift,
    AlignPairwiseTag{});
}

AminoacidAlignmentStatus alignPairwise(const AminoacidSequence& query, const AminoacidSequence& ref,
  const std::vector<int>& gapOpenClose, const NextalignAlignmentOptions& alignmentOptions,
  const NextalignSeedOptions& seedOptions, int bandWidth, int shift) {
  return alignPairwise(query, ref, gapOpenClose, alignmentOptions, seedOptions, bandWidth, shift, AlignPairwiseTag{});
}
