#pragma once

#include <string>
#include <vector>

struct PeptideInternal;
struct FrameShiftResult;

namespace Nextclade {

  std::vector<FrameShiftResult> flattenFrameShifts(const std::vector<PeptideInternal>& queryPeptides);
}// namespace Nextclade
