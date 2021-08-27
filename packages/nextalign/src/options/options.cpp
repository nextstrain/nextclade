#include <nextalign/nextalign.h>

namespace {
  inline constexpr const NextalignOptions OPTIONS_DEFAULT = {
    .alignment =
      {
        .minimalLength = 100,
        .penaltyGapExtend = 0,
        .penaltyGapOpen = 6,
        .penaltyGapOpenInFrame = 7,
        .penaltyGapOpenOutOfFrame = 8,
        .penaltyMismatch = 1,
        .scoreMatch = 3,
        .maxIndel = 400,
      },
    .seedNuc =
      {
        .seedLength = 21,
        .minSeeds = 10,
        .seedSpacing = 100,
        .mismatchesAllowed = 3,
      },
    .seedAa =
      {
        .seedLength = 12,
        .minSeeds = 10,
        .seedSpacing = 100,
        .mismatchesAllowed = 2,
      },
  };
}//namespace

NextalignOptions getDefaultOptions() {
  return OPTIONS_DEFAULT;
}
