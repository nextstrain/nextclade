#pragma once

#include <nextalign/nextalign.h>


struct GapCounts {
  int leading;
  int internal;
  int trailing;
  int total;
};


struct AlignmentParams {
  int bandWidth;
  int shift;
};

/** Returns number of leading, internal and trailing gaps, as well as total count */
GapCounts countGaps(const NucleotideSequence& seq);

/** Returns aminoacid alignment parameters deduced from nucleotide alignment */
AlignmentParams calculateAaAlignmentParams(const GapCounts& queryGapCounts, const GapCounts& refGapCounts);
