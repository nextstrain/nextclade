#pragma once

#include <nextalign/nextalign.h>


std::vector<Range> detectFrameShifts(//
  const NucleotideSequence& ref,     //
  const NucleotideSequence& query    //
);

std::vector<InternalFrameShiftResultWithMask> translateFrameShifts(//
  const NucleotideSequence& query,                                 //
  const std::vector<Range>& nucRelFrameShifts,                     //
  const std::vector<int>& coordMap,                                //
  const std::vector<int>& coordMapReverse,                         //
  const Gene& gene                                                 //
);

int findMaskBegin(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel);

int findMaskEnd(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel);
