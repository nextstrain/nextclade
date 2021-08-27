#pragma once

#include <optional>
#include <vector>

struct NextalignResultInternal;

namespace Nextclade {
  struct QCRulesConfigFrameShifts;
  struct QcResultFrameShifts;

  std::optional<QcResultFrameShifts> ruleFrameShifts(//
    const ::NextalignResultInternal& alignment,      //
    const QCRulesConfigFrameShifts& config           //
  );
}// namespace Nextclade
