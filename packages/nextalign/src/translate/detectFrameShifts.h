#pragma once

#include <nextalign/nextalign.h>


std::vector<Range> detectFrameShifts(//
  const NucleotideSequence& ref,               //
  const NucleotideSequence& query              //
);

std::vector<FrameShiftResult> translateFrameShifts(     //
  const std::vector<Range>& nucRelFrameShifts,//
  const std::vector<int>& coordMap,                     //
  const std::vector<int>& coordMapReverse,              //
  const Gene& gene                                      //
);
