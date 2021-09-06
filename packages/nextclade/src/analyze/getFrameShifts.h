#pragma once

#include <string>
#include <vector>

struct PeptideInternal;

namespace Nextclade {
  struct FrameShiftResult;

  std::vector<FrameShiftResult> getFrameShifts(const std::vector<PeptideInternal>& queryPeptides);
}// namespace Nextclade
