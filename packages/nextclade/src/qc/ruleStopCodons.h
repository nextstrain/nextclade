#pragma once

#include <optional>
#include <common/safe_vector.h>

struct NextalignResultInternal;

namespace Nextclade {
  struct QCRulesConfigStopCodons;
  struct QcResultStopCodons;

  std::optional<QcResultStopCodons> ruleStopCodons(//
    const ::NextalignResultInternal& alignment,    //
    const QCRulesConfigStopCodons& config          //
  );
}// namespace Nextclade
