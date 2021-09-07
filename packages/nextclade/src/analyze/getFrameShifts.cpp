#include "getFrameShifts.h"

#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <string>
#include <vector>

namespace Nextclade {
  std::vector<FrameShiftResult> flattenFrameShifts(const std::vector<PeptideInternal>& queryPeptides) {
    std::vector<FrameShiftResult> results;
    for (const auto& peptide : queryPeptides) {
      for (const auto& result : peptide.frameShiftResults) {
        results.push_back(result);
      }
    }
    return results;
  }
}// namespace Nextclade
