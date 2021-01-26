#include <algorithm>
#include <cmath>
#include <ctime>
#include <iostream>
#include <string>
#include <vector>

#include "alignPairwise.h"
#include "../alphabet/aminoacids.h"
#include "../alphabet/nucleotides.h"
#include "../match/matchAa.h"
#include "../match/matchNuc.h"
#include "../utils/safe_cast.h"
#include "../utils/vector2d.h"


namespace details {
  int round(double x) {
    return safe_cast<int>(std::round(x));
  }
}// namespace details

class ErrorAlignmentNoSeedMatches : public std::runtime_error {
public:
  explicit ErrorAlignmentNoSeedMatches() : std::runtime_error("Unable to align: no seed matches") {}
};

class ErrorAlignmentSequenceTooShort : public std::runtime_error {
public:
  explicit ErrorAlignmentSequenceTooShort() : std::runtime_error("Unable to align: sequence is too short") {}
};

class ErrorAlignmentBadSeedMatches : public std::runtime_error {
public:
  explicit ErrorAlignmentBadSeedMatches()
      : std::runtime_error("Unable to align: too many insertions, deletions, duplications, or ambiguous seed matches") {
  }
};


AlignmentParameters alignmentParameters = {
  .gapExtend = 0,
  .gapOpen = -6,
  .misMatch = -1,
  .match = 3,
};

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
// This start position is set be the previous match. It is this sensitive to a seed matching in the wrong
// part of the sequence and this is likely to produce errors for genomes with repeated sequence
template<typename Letter>
SeedMatch seedMatch(
  const Sequence<Letter>& kmer, const Sequence<Letter>& ref, const int start_pos, const int allowed_mismatches) {
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
      if (tmpScore + allowed_mismatches < pos) {
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
SeedAlignment seedAlignment(const Sequence<Letter>& query, const Sequence<Letter>& ref) {
  const int querySize = safe_cast<int>(query.size());
  const int refSize = safe_cast<int>(ref.size());

  constexpr const int seedLength = 21;
  constexpr const int allowed_mismatches = 3;

  const int nSeeds = refSize > 1000 ? details::round(refSize / 100.0) : 10;
  const int margin = refSize > 10000 ? 30 : details::round(refSize / 300.0);
  const int bandWidth = details::round((refSize + querySize) * 0.5) - 3;
  int start_pos = 0;
  if (bandWidth < 2 * seedLength) {
    return {.meanShift = details::round((refSize - querySize) * 0.5), .bandWidth = bandWidth};
  }

  const auto mapToGoodPositions = getMapToGoodPositions(query, seedLength);
  const int nGoodPositions = mapToGoodPositions.size();

  // TODO: Maybe use something other than array? A struct with named fields to make
  //  the code in the end of the function less confusing?
  using Clamp = std::array<int, 4>;
  std::vector<Clamp> seedMatches;
  // generate kmers equally spaced on the query
  const auto seedCover = safe_cast<double>(nGoodPositions - 2 * margin);
  const double kmerSpacing = (seedCover - 1.0) / (nSeeds - 1.0);
  for (int ni = 0; ni < nSeeds; ++ni) {

    const int qPos = mapToGoodPositions[details::round(margin + (kmerSpacing * ni))];
    // FIXME: query.substr() creates a new string. Use string view instead.
    const auto tmpMatch = seedMatch(query.substr(qPos, seedLength), ref, start_pos, allowed_mismatches);

    // only use seeds with at most allowed_mismatches
    if (tmpMatch.score >= seedLength - allowed_mismatches) {
      seedMatches.push_back({qPos, tmpMatch.shift, tmpMatch.shift - qPos, tmpMatch.score});
      start_pos = tmpMatch.shift;
    }
  }
  if (seedMatches.size() < 2) {
    throw ErrorAlignmentNoSeedMatches();
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

  const int meanShift = details::round(0.5 * (minShift + maxShift));
  const int bandWidthFinal = maxShift - minShift + 9;
  return {.meanShift = meanShift, .bandWidth = bandWidthFinal};
}

template<typename Letter>
ForwardTrace scoreMatrix(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const std::vector<int>& gapOpenClose, int bandWidth, int meanShift) {
  // allocate a matrix to record the matches
  const int querySize = safe_cast<int>(query.size());
  const int refSize = safe_cast<int>(ref.size());
  const int n_rows = bandWidth * 2 + 1;
  const int n_cols = refSize + 1;

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
  const int gapExtend = alignmentParameters.gapExtend;
  const int gapOpen = alignmentParameters.gapOpen;
  const int misMatch = alignmentParameters.misMatch;
  const int match = alignmentParameters.match;
  const int NO_ALIGN = -(match - misMatch) * refSize;

  for (int si = 2 * bandWidth; si > bandWidth; si--) {
    paths(si, 0) = qryGAPmatrix;
  }
  paths(bandWidth, 0) = MATCH;
  qryGaps[bandWidth] = gapOpen;
  for (int si = bandWidth - 1; si >= 0; si--) {
    paths(si, 0) = refGAPmatrix;
    qryGaps[si] = gapOpen;
  }
  for (int ri = 0; ri < refSize; ri++) {
    int qPos = ri - (bandWidth + meanShift);
    int refGaps = gapOpenClose[ri];
    for (int si = 2 * bandWidth; si >= 0; si--) {
      int tmpPath = 0, score = 0, origin = 0;
      int qGapExtend = 0, rGapExtend = 0, rGapOpen = 0, qGapOpen = 0;
      int tmpMatch = 0, tmpScore = 0;
      if (qPos < 0) {
        // precedes query sequence -- no score, origin is query gap
        // we could fill all of this at once
        score = 0;
        tmpPath += qryGAPextend;
        refGaps = gapOpenClose[ri];
        origin = qryGAPmatrix;
      } else if (qPos < querySize) {
        // if the shifted position is within the query sequence

        // no gap -- match case
        tmpMatch = lookupMatchScore(query[qPos], ref[ri]) > 0 ? match : misMatch;
        score = scores(si, ri) + tmpMatch;
        origin = MATCH;

        // check the scores of a reference gap
        if (si < 2 * bandWidth) {
          rGapExtend = refGaps + gapExtend;
          rGapOpen = scores(si + 1, ri + 1) + gapOpenClose[ri + 1];
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
          qGapExtend = qryGaps[si - 1] + gapExtend;
          qGapOpen = scores(si - 1, ri) + gapOpenClose[ri];
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

  return {.scores = scores, .paths = paths};
}

template<typename Letter>
AlignmentResult<Letter> backTrace(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const vector2d<int>& scores, const vector2d<int>& paths, int meanShift) {
  const int rowLength = scores.num_cols();
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
  for (int i = 0; i < scoresSize; i++) {
    const auto is = indexToShift(i);
    lastIndexByShift[i] = rowLength - 1 < querySize + is ? rowLength - 1 : querySize + is;

    invariant_greater(lastIndexByShift[i], 0);
    invariant_less(lastIndexByShift[i], scores.num_cols());

    lastScoreByShift[i] = scores(i, lastIndexByShift[i]);
    if (lastScoreByShift[i] > bestScore) {
      bestScore = lastScoreByShift[i];
      si = i;
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

  std::reverse(aln_query.begin(), aln_query.end());
  std::reverse(aln_ref.begin(), aln_ref.end());

  return {
    .query = aln_query,
    .ref = aln_ref,
    .alignmentScore = bestScore,
  };
}

struct AlignPairwiseTag {};


template<typename Letter>
AlignmentResult<Letter> alignPairwise(const Sequence<Letter>& query, const Sequence<Letter>& ref,
  const std::vector<int>& gapOpenClose, int minimalLength, AlignPairwiseTag) {
  const int querySize = query.size();
  if (querySize < minimalLength) {
    throw ErrorAlignmentSequenceTooShort();
  }

  const SeedAlignment& seedAlignmentResult = seedAlignment(query, ref);
  const auto& bandWidth = seedAlignmentResult.bandWidth;
  const auto& meanShift = seedAlignmentResult.meanShift;

  if (bandWidth > 400) {
    throw ErrorAlignmentBadSeedMatches();
  }
  const ForwardTrace& forwardTrace = scoreMatrix(query, ref, gapOpenClose, bandWidth, meanShift);
  const auto& scores = forwardTrace.scores;
  const auto& paths = forwardTrace.paths;

  return backTrace(query, ref, scores, paths, meanShift);
}


NucleotideAlignmentResult alignPairwise(const NucleotideSequence& query, const NucleotideSequence& ref,
  const std::vector<int>& gapOpenClose, int minimalLength) {
  return alignPairwise(query, ref, gapOpenClose, minimalLength, AlignPairwiseTag{});
}

AminoacidAlignmentResult alignPairwise(const AminoacidSequence& query, const AminoacidSequence& ref,
  const std::vector<int>& gapOpenClose, int minimalLength) {
  return alignPairwise(query, ref, gapOpenClose, minimalLength, AlignPairwiseTag{});
}
