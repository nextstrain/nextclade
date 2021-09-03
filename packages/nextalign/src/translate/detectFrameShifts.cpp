#include "detectFrameShifts.h"

#include <utils/contract.h>
#include <utils/safe_cast.h>
#include <utils/to_underlying.h>
#include <utils/wraparound.h>

class FrameShiftDetector {
  static constexpr int POSITION_INVALID = -1;

  std::vector<FrameShiftRange> frameShifts;
  int oldFrame = 0;
  int frame = 0;
  int begin = POSITION_INVALID;
  int end = POSITION_INVALID;
  bool dirty = false;

  /** Updates detector's state */
  void update(int shift, int pos) {
    oldFrame = frame;
    frame -= shift;
    frame = wraparound(frame, 3);

    // Whether transitioned from no shift to shift
    const bool toShift = oldFrame == 0 && frame != 0;

    // Whether transitioned from shift to no shift
    const bool toNoShift = oldFrame != 0 && frame == 0;

    if (toNoShift) {
      end = pos;
    }

    if (toShift || toNoShift) {
      dirty = true;
    }
  }

  void reset() {
    begin = POSITION_INVALID;
    end = POSITION_INVALID;
  }

public:
  explicit FrameShiftDetector(int startFrame) : frame(startFrame) {}

  [[nodiscard]] std::vector<FrameShiftRange> getFrameShifts() const {
    return frameShifts;
  }

  void addInsertion(int pos) {
    update(-1, pos);
  }

  void addDeletion(int pos) {
    update(+1, pos);
  }

  void advance(int pos) {
    if (!dirty) {
      return;
    }

    if (frame == 0 && begin != POSITION_INVALID) {
      frameShifts.push_back(FrameShiftRange{.begin = begin, .end = end});
      reset();
    }

    if (frame != 0) {
      begin = pos;
    }

    dirty = false;
  }

  void done(int pos) {
    if (begin != POSITION_INVALID) {
      frameShifts.push_back(FrameShiftRange{.begin = begin, .end = pos + 1});
      reset();
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
    } else {
      frameShiftDetector.advance(pos);
    }
  }
  frameShiftDetector.done(length - 1);

  return FrameShiftResults{
    .frameShifts = frameShiftDetector.getFrameShifts(),
  };
}
