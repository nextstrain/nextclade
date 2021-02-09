#pragma once

#include <nextalign/nextalign.h>

inline const NextalignOptions OPTIONS_DEFAULT = {
  .alignment =
    {
      .minimalLength = 100,
      .scoreGapExtend = 0,
      .scoreGapOpen = -6,
      .scoreGapOpenInFrame = -5,
      .scoreMismatch = -1,
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
      .seedLength = 21,
      .minSeeds = 10,
      .seedSpacing = 100,
      .mismatchesAllowed = 3,
    },
  .genes = {},
};
