#include "detectFrameShifts.h"

#include <utils/contract.h>
#include <utils/safe_cast.h>
#include <utils/to_underlying.h>
#include <utils/wraparound.h>

#include "../utils/at.h"

class FrameShiftDetector {
  // Invalid/unset positions are set with this value
  static constexpr auto POSITION_INVALID = std::numeric_limits<int>::min();

  std::vector<FrameShiftRange> frameShifts;// List of detected frame shifts
  int frame = 0;                           // Frame of the previously processed character (not necessarily n-1!)
  int oldFrame = 0;                        // Frame of the character before previous (not necessarily n-2!)
  int begin = POSITION_INVALID;            // Remembers potential begin of the current frame shift range
  int end = POSITION_INVALID;              // Remembers potential end of the current frame shift range
  int lastIndel = POSITION_INVALID;        // Remembers position of the last insertion of deletion
  bool dirty = false;                      // Allows to avoid full run in `advance()` on every character

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
  [[nodiscard]] std::vector<FrameShiftRange> getFrameShifts() const {
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
      frameShifts.push_back(FrameShiftRange{.begin = begin, .end = end});
      reset();
    }

    if (frame != 0 && begin == POSITION_INVALID) {
      // We are in the frame shift. This *might* be the the beginning of a shifted range. Note that it might also not
      // be, because there might be more non-shifting characters ahead before .
      begin = pos;
    }

    dirty = false;
  }

  /** Run this after sequence iteration is over, with the length of the sequence */
  void done(int pos) {
    if (begin != POSITION_INVALID) {
      frameShifts.push_back(FrameShiftRange{.begin = begin, .end = pos});
      reset();
    }
  }
};

/**
 * Detects nucleotide frame shift in the query nucleotide sequence
 * and the corresponding aminoacid frame shifts in the query peptide
 */
std::vector<FrameShiftRange> detectFrameShifts(//
  const NucleotideSequence& ref,               //
  const NucleotideSequence& query              //
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
 * Converts relative nucleotide frame shifts to the final result, including
 * relative and absolute nucleotide frame shifts and relative aminoacid frame shifts
 */
std::vector<FrameShiftResult> translateFrameShifts(     //
  const std::vector<FrameShiftRange>& nucRelFrameShifts,//
  const std::vector<int>& coordMapReverse,              //
  const Gene& gene                                      //
) {
  precondition_less(gene.start, coordMapReverse.size());
  precondition_less_equal(gene.end, coordMapReverse.size());
  precondition_less(gene.start, gene.end);

  std::vector<FrameShiftResult> frameShifts;
  frameShifts.reserve(nucRelFrameShifts.size());
  for (const auto& nucRangeRel : nucRelFrameShifts) {
    // Absolute positions will change after gap stripping according to the reverse coordinate map
    FrameShiftRange nucRangeAbs{};
    nucRangeAbs.begin = at(coordMapReverse, nucRangeRel.begin + gene.start);
    nucRangeAbs.end = at(coordMapReverse, nucRangeRel.end + gene.start);

    auto codonRange = FrameShiftRange{
      .begin = nucRangeRel.begin / 3,
      .end = nucRangeRel.end / 3,
    };

    frameShifts.push_back(FrameShiftResult{
      .geneName = gene.geneName,
      .nucRel = nucRangeRel,
      .nucAbs = nucRangeAbs,
      .codon = codonRange,
    });
  }

  return frameShifts;
}
