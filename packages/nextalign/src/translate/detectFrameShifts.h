#pragma once

#include <nextalign/nextalign.h>


struct FrameShiftResults {
  std::vector<FrameShiftRange> frameShifts;

};

FrameShiftResults detectFrameShifts(const NucleotideSequence& ref, const NucleotideSequence& query);
