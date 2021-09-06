#include "getFrameShifts.h"

#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <string>
#include <vector>

namespace Nextclade {
  std::vector<FrameShiftResult> getFrameShifts(const std::vector<PeptideInternal>& queryPeptides) {
    std::vector<FrameShiftResult> result;
    for (const auto& peptide : queryPeptides) {
      for (const auto& frameShiftRange : peptide.frameShiftRanges) {
        result.emplace_back(FrameShiftResult{.geneName = peptide.name, .frameShiftRange = frameShiftRange});
      }
    }
    return result;
  }
}// namespace Nextclade
