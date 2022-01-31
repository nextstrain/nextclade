#include "alignmentParams.h"

#include <nextalign/nextalign.h>

#include <common/debug_trace.h>
#include "../utils/safe_cast.h"


GapCounts countGaps(const NucleotideSequence& seq) {
  int len = safe_cast<int>(seq.size());

  if (len == 0) {
    return GapCounts{
      .leading = 0,
      .internal = 0,
      .trailing = 0,
      .total = 0,
    };
  }

  if (len == 1) {
    return GapCounts{
      .leading = isGap(seq[0]) ? 1 : 0,
      .internal = 0,
      .trailing = 0,
      .total = 0,
    };
  }

  // Rewind forward until the first non-gap
  int begin = 0;
  while (begin < len && isGap(seq[begin])) {
    ++begin;
  }


  // Rewind backwards starting from the end, until the first non-gap
  int end = len - 1;
  while (end > begin && isGap(seq[end])) {
    --end;
  }

  // Count gaps in the internal region
  int totalInternalGaps = 0;
  for (int i = begin; i < end; ++i) {
    if (isGap(seq[i])) {
      ++totalInternalGaps;
    }
  }

  int leading = begin;
  int internal = totalInternalGaps;
  int trailing = len - end - 1;
  int total = leading + internal + trailing;

  return GapCounts{
    .leading = leading,
    .internal = internal,
    .trailing = trailing,
    .total = total,
  };
}

AlignmentParams calculateAaAlignmentParams(const GapCounts& queryGapCounts, const GapCounts& refGapCounts) {
  constexpr int BASE_BAND_WIDTH = 5;// An arbitrary magic number to give some additional room for alignment

  const int bandWidth = (queryGapCounts.internal + refGapCounts.internal) / 3 + BASE_BAND_WIDTH;
  const int shift = (queryGapCounts.leading - refGapCounts.leading) / 3 + (queryGapCounts.internal - refGapCounts.internal) / 6;

  debug_trace("Deduced alignment params: bandWidth={:}, shift={:}\n", bandWidth, shift);

  return AlignmentParams{
    .bandWidth = bandWidth,
    .shift = shift,
  };
  ;
}
