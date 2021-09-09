#pragma once

#include <vector>

struct FrameShiftResult;

namespace Nextclade {
  struct AminoacidChangesReport;

  AminoacidChangesReport filterAminoacidChanges(const AminoacidChangesReport& aaChanges,
    const std::vector<FrameShiftResult>& frameShits);
}// namespace Nextclade
