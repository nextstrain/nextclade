#pragma once

#include <nextalign/nextalign.h>

class CoordinateMapper;

safe_vector<Range> detectFrameShifts(//
  const NucleotideSequence& ref,     //
  const NucleotideSequence& query    //
);

safe_vector<InternalFrameShiftResultWithMask> translateFrameShifts(//
  const NucleotideSequence& query,                                 //
  const safe_vector<Range>& nucRelFrameShifts,                     //
  const CoordinateMapper& coordMap,                                //
  const Gene& gene                                                 //
);

int findMaskBegin(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel);

int findMaskEnd(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel);

Range findMask(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel);
