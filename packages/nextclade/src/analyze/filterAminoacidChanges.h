#pragma once

#include <vector>

struct FrameShiftResult;

namespace Nextclade {
  struct AminoacidChangesReport;

  void filterAminoacidChangesInPlace(AminoacidChangesReport& aaChanges,
    const std::vector<FrameShiftResult>& frameShits);
}// namespace Nextclade
