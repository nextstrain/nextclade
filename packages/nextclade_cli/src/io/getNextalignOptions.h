#include <nextalign/nextalign.h>

#include "../generated/cli.h"

namespace Nextclade {
  inline NextalignOptions cliOptionsToNextalignOptions(const CliParamsRun& cliParams) {
    return NextalignOptions{
      .alignment =
        {
          .minimalLength = cliParams.minimalLength,
          .penaltyGapExtend = cliParams.penaltyGapExtend,
          .penaltyGapOpen = cliParams.penaltyGapOpen,
          .penaltyGapOpenInFrame = cliParams.penaltyGapOpenInFrame,
          .penaltyGapOpenOutOfFrame = cliParams.penaltyGapOpenOutOfFrame,
          .penaltyMismatch = cliParams.penaltyMismatch,
          .scoreMatch = cliParams.scoreMatch,
          .maxIndel = cliParams.maxIndel,
        },
      .seedNuc =
        {
          .seedLength = cliParams.nucSeedLength,
          .minSeeds = cliParams.nucMinSeeds,
          .seedSpacing = cliParams.nucSeedSpacing,
          .mismatchesAllowed = cliParams.nucMismatchesAllowed,
        },
      .seedAa =
        {
          .seedLength = cliParams.aaSeedLength,
          .minSeeds = cliParams.aaMinSeeds,
          .seedSpacing = cliParams.aaSeedSpacing,
          .mismatchesAllowed = cliParams.aaMismatchesAllowed,
        },
      .translatePastStop = !cliParams.noTranslatePastStop,
    };
  }

}// namespace Nextclade
