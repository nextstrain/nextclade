#include "detectFrameShifts.h"

#include <fmt/format.h>
#include <utils/contract.h>
#include <utils/safe_cast.h>
#include <utils/to_underlying.h>
#include <utils/wraparound.h>

#include "../utils/at.h"
#include "mapCoordinates.h"

class FrameShiftDetector {
  // Invalid/unset positions are set with this value
  static constexpr auto POSITION_INVALID = std::numeric_limits<int>::min();

  std::vector<Range> frameShifts;  // List of detected frame shifts
  int frame = 0;                   // Frame of the previously processed character (not necessarily n-1!)
  int oldFrame = 0;                // Frame of the character before previous (not necessarily n-2!)
  int begin = POSITION_INVALID;    // Remembers potential begin of the current frame shift range
  int end = POSITION_INVALID;      // Remembers potential end of the current frame shift range
  int lastIndel = POSITION_INVALID;// Remembers position of the last insertion of deletion
  bool dirty = false;              // Allows to avoid full run in `advance()` on every character

  /** Updates detector's state */
  void update(int shift, int pos) {
    oldFrame = frame;
    frame += shift;
    frame = wraparound(frame, 3);

    // Whether transitioned from no shift to shift
    const bool toShift = oldFrame == 0 && frame != 0;

    // Whether transitioned from shift to no shift
    const bool toNoShift = oldFrame != 0 && frame == 0;

    // Whether the previous character is an insertion or a deletion
    const bool prevIsIndel = pos - lastIndel == 1;

    if (!prevIsIndel) {
      // Previous character is non-shifting, so it *might* be the end of the shift. Note that it might also not be,
      // because there might be more non-shifting characters ahead in the same shifted range.
      end = pos;
    }

    if (toShift || toNoShift) {
      // Transitioned from shift or to shift, mark the next character for the full run in `advance()`.
      dirty = true;
    }

    lastIndel = pos;
  }

  /** Resets the state of the detector */
  void reset() {
    begin = POSITION_INVALID;
    end = POSITION_INVALID;
    lastIndel = POSITION_INVALID;
  }

public:
  explicit FrameShiftDetector(int startFrame) : frame(startFrame) {}

  /** Returns frame shifts detected so far */
  [[nodiscard]] std::vector<Range> getFrameShifts() const {
    return frameShifts;
  }

  /** Call this for every insertion */
  void addInsertion(int pos) {
    update(-1, pos);
  }

  /** Call this for every deletion */
  void addDeletion(int pos) {
    update(+1, pos);
  }

  /** Call this for every non-shifting character (not an indel) */
  void advance(int pos) {
    // Avoid full run in advance() on every character.
    // Only run 1 character when requested by setting `dirty = true` in `update()`.
    if (!dirty) {
      return;
    }

    if (frame == 0 && begin != POSITION_INVALID) {
      // We are not in shift and `begin` was set previously. This is the end of the shift range. Remember the range.
      frameShifts.push_back(Range{.begin = begin, .end = end});
      reset();
    }

    if (frame != 0 && begin == POSITION_INVALID) {
      // We are in the frame shift. This *might* be the the beginning of a shifted range. Note that it might also not
      // be, because there might be more non-shifting characters ahead.
      begin = pos;
    }

    dirty = false;
  }

  /** Run this after sequence iteration is over, with the length of the sequence */
  void done(int pos) {
    if (begin != POSITION_INVALID) {
      frameShifts.push_back(Range{.begin = begin, .end = pos});
      reset();
    }
  }
};

/**
 * Detects nucleotide frame shift in the query nucleotide sequence
 * and the corresponding aminoacid frame shifts in the query peptide
 */
std::vector<Range> detectFrameShifts(//
  const NucleotideSequence& ref,     //
  const NucleotideSequence& query    //
) {
  precondition_equal(ref.size(), query.size());
  int length = safe_cast<int>(ref.size());

  FrameShiftDetector frameShiftDetector{0};
  for (int pos = 0; pos < length; ++pos) {
    if (ref[pos] == Nucleotide::GAP) {
      frameShiftDetector.addInsertion(pos);
    } else if (query[pos] == Nucleotide::GAP) {
      frameShiftDetector.addDeletion(pos);
    } else {
      frameShiftDetector.advance(pos);
    }
  }
  frameShiftDetector.done(length);

  return frameShiftDetector.getFrameShifts();
}

/**
 * Find beginning nucleotide position of a deletion that immediately proceeds and adjacent to the frame shift
 */
int findMaskBegin(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel) {
  // From begin, rewind back to find the first adjacent nuc deletion
  int begin = frameShiftNucRangeRel.begin - 1;
  if (begin > 0) {
    while (begin >= 0 && seq[begin] == Nucleotide::GAP) {
      --begin;
    }
  }

  // `begin` now points to the nuc that is immediately before the deletion.
  // Go back one nuc to make it point to the deletion.
  return begin + 1;
}

/**
 * Find ending nucleotide position of a deletion that immediately follows and adjacent to the frame shift
 */
int findMaskEnd(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel) {
  int length = safe_cast<int>(seq.size());
  // From end, rewind forward to find the last adjacent nuc deletion
  int end = frameShiftNucRangeRel.end;
  while (end < length && seq[end] == Nucleotide::GAP) {
    ++end;
  }

  // `end` now points to the nuc that is 1 past the deletion. Which is correct - we use semi-open ranges.
  return end;
}


Range findMask(const NucleotideSequence& query, const Range& frameShiftNucRangeRel) {
  return Range{
    .begin = findMaskBegin(query, frameShiftNucRangeRel),
    .end = findMaskEnd(query, frameShiftNucRangeRel),
  };
}

/**
 * Converts relative nucleotide frame shifts to the final result, including
 * relative and absolute nucleotide frame shifts and relative aminoacid frame shifts
 */
std::vector<InternalFrameShiftResultWithMask> translateFrameShifts(//
  const NucleotideSequence& query,                                 //
  const std::vector<Range>& nucRelFrameShifts,                     //
  const CoordinateMapper& coordMap,                                //
  const Gene& gene                                                 //
) {
  precondition_less(gene.start, gene.end);

  std::vector<InternalFrameShiftResultWithMask> frameShifts;
  frameShifts.reserve(nucRelFrameShifts.size());
  for (const auto& nucRelAln : nucRelFrameShifts) {
    // Relative nuc range is in alignment coordinates. However, after insertions are stripped,
    // absolute positions may change - so in order to get absolute range, we need to convert range boundaries
    // from alignment coordinates (as in aligned reference sequence, with gaps) to reference coordinates
    // (as in the original reference coordinates, with gaps stripped).

    const auto geneStartRef = gene.start;
    const auto geneStartAln = coordMap.refToAln(gene.start);// Gene start in alignment coordinates

    Range nucAbsAln = nucRelAln + geneStartAln;
    Range nucAbsRef = coordMap.alnToRef(nucAbsAln);
    Range nucRelRef =  nucAbsRef - geneStartRef;
    Range codon = nucRelRef / 3;

    Range maskNucRelAln = findMask(query, nucRelAln);
    Range maskNucAbsAln = maskNucRelAln + geneStartAln;
    Range maskNucAbsRef = coordMap.alnToRef(maskNucAbsAln);
    Range maskNucRelRef = maskNucAbsRef - geneStartRef;
    Range maskCodon = maskNucRelRef / 3;

    FrameShiftContext gapsLeading{
      .codon{
        .begin = maskCodon.begin,
        .end = codon.begin,
      },
    };

    FrameShiftContext gapsTrailing{
      .codon{
        .begin = codon.end,
        .end = maskCodon.end,
      },
    };

    frameShifts.push_back(InternalFrameShiftResultWithMask{
      .frameShift =
        FrameShiftResult{
          .geneName = gene.geneName,
          .nucRel = nucRelAln,
          .nucAbs = nucAbsRef,
          .codon = codon,
          .gapsLeading = gapsLeading,
          .gapsTrailing = gapsTrailing,
        },
      .codonMask = maskCodon,
    });
  }

  return frameShifts;
}
