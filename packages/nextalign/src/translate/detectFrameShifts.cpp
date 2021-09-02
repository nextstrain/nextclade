#include "detectFrameShifts.h"

#include <utils/contract.h>
#include <utils/safe_cast.h>
#include <utils/to_underlying.h>

class FrameShiftDetector {
  enum class FrameShiftDirection : int {
    Deletion = -1,
    None = 0,
    Insertion = 1,
  };

  std::vector<FrameShiftRange> frameShifts;
  int begin = 0;
  int frame = 0;

  void update(FrameShiftDirection direction, int pos) {
    int shift = to_underlying(direction);
    int oldFrame = frame;

    frame += shift;
    frame %= 3;
    frame = std::abs(frame);

    if (oldFrame == 0 && frame != 0) {
      // Passing from no shift to shift: remember the end position of this shift (we iterate backwards)
      begin = pos;
    } else if (oldFrame != 0 && frame == 0) {
      // Passing from shift to no shift: the shift is over, add it to the array
      int end = pos;
      frameShifts.emplace_back(FrameShiftRange{.begin = begin, .end = end});
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

  return FrameShiftResults{
    .frameShifts = frameShiftDetector.getFrameShifts(),
  };
}
