#pragma once

#include <nextalign/nextalign.h>

#include "mapCoordinates.h"


std::vector<Range> detectFrameShifts(//
  const NucleotideSequence& ref,     //
  const NucleotideSequence& query    //
);

std::vector<InternalFrameShiftResultWithMask> translateFrameShifts(//
  const NucleotideSequence& query,                                 //
  const std::vector<Range>& nucRelFrameShifts,                     //
  const CoordinateMapper<Nucleotide>& coordMap,                    //
  const Gene& gene                                                 //
);

int findMaskBegin(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel);

int findMaskEnd(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel);

Range findMask(const NucleotideSequence& seq, const Range& frameShiftNucRangeRel);
