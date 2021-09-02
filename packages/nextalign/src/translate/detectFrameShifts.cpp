#include "detectFrameShifts.h"

#include <utils/contract.h>
#include <utils/safe_cast.h>
#include <utils/to_underlying.h>
#include <utils/wraparound.h>

class FrameShiftDetector {
  enum class FrameShiftDirection : int {
    Deletion = -1,
    Insertion = 1,
  };

  std::vector<FrameShiftRange> frameShifts;
  int frame = 0;
  int end = 0;

  /** Remembers a new frame shift */
  void addNewShift(int begin) {
    frameShifts.emplace_back(FrameShiftRange{.begin = begin, .end = end});
  }

  /** Takes last remembered frame shift and extends it */
  void extendLastShift() {
    invariant_greater(frameShifts.size(), 0);
    auto& last = frameShifts.back();
    last.end = end;
  }

  /** Updates detector's state, potentially adds new shifts, and extends previous ones */
  void update(FrameShiftDirection direction, int pos) {
    int shift = to_underlying(direction);

    const int oldFrame = frame;
    frame += shift;
    frame = wraparound(frame, 3);

    const int oldEnd = end;
    end = pos + 1;

    // Whether transitioned from no shift to shift
    const bool toShift = oldFrame == 0 && frame != 0;

    // Whether transitioned from shift to no shift
    const bool toNoShift = oldFrame != 0 && frame == 0;

    // Whether this shift is adjacent to another shift before it
    const bool isAdjacent = end - oldEnd == 1;

    // If we just transitioned to shifted state and there is no adjacent shift, then we should add a new shift object.
    if (toShift && !isAdjacent) {
      addNewShift(pos);
    }
    // If we:
    //  - just transitioned to non-shifted state
    //  - or we are still in shifted state and there is an adjacent shift preceding
    // then extend the last remembered shift
    else if (toNoShift || isAdjacent) {
      extendLastShift();
    }
  }

public:
  explicit FrameShiftDetector(int startFrame) : frame(startFrame) {}

  [[nodiscard]] std::vector<FrameShiftRange> getFrameShifts() const {
    return frameShifts;
  }

  void addInsertion(int pos) {
    update(FrameShiftDirection::Insertion, pos);
  }

  void addDeletion(int pos) {
    update(FrameShiftDirection::Deletion, pos);
  }

  void done(int pos) {
    end = pos + 1;
    if (frame != 0) {
      // We are at the end of sequence. If we are still in shift, terminate it.
      extendLastShift();
    }
  }
};

FrameShiftResults detectFrameShifts(const NucleotideSequence& ref, const NucleotideSequence& query) {
  precondition_equal(ref.size(), query.size());
  int length = safe_cast<int>(ref.size());

  FrameShiftDetector frameShiftDetector{0};
  for (int pos = 0; pos < length; ++pos) {
    if (ref[pos] == Nucleotide::GAP) {
      frameShiftDetector.addInsertion(pos);
    } else if (query[pos] == Nucleotide::GAP) {
      frameShiftDetector.addDeletion(pos);
    }
  }
  frameShiftDetector.done(length - 1);

  return FrameShiftResults{
    .frameShifts = frameShiftDetector.getFrameShifts(),
  };
}
