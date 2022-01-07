#include "getFrameShifts.h"

#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <string>
#include <common/safe_vector.h>

namespace Nextclade {
  safe_vector<FrameShiftResult> flattenFrameShifts(const safe_vector<PeptideInternal>& queryPeptides) {
    safe_vector<FrameShiftResult> results;
    for (const auto& peptide : queryPeptides) {
      for (const auto& result : peptide.frameShiftResults) {
        results.push_back(result);
      }
    }
    return results;
  }
}// namespace Nextclade
