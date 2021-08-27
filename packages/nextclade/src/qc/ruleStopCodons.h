#pragma once

#include <optional>
#include <vector>

struct NextalignResultInternal;

namespace Nextclade {
  struct QCRulesConfigStopCodons;
  struct QcResultStopCodons;

  std::optional<QcResultStopCodons> ruleStopCodons(//
    const ::NextalignResultInternal& alignment,    //
    const QCRulesConfigStopCodons& config          //
  );
}// namespace Nextclade
