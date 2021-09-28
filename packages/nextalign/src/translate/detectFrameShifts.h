#pragma once

#include <nextalign/nextalign.h>

class CoordinateMapper;

std::vector<Range> detectFrameShifts(//
  const NucleotideSequence& ref,     //
  const NucleotideSequence& query    //
);

std::vector<InternalFrameShiftResultWithMask> translateFrameShifts(//
  const NucleotideSequence& query,                                 //
  const std::vector<Range>& nucRelFrameShifts,                     //
  const CoordinateMapper& coordMap,                                //
  const Gene& gene                                                 //
);

int findMaskBegin(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel);

int findMaskEnd(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel);
