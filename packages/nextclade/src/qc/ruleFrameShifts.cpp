#include "ruleFrameShifts.h"

#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <optional>

#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"

namespace Nextclade {
  std::optional<QcResultFrameShifts> ruleFrameShifts(//
    const NextalignResultInternal& alignment,        //
    const QCRulesConfigFrameShifts& config           //
  ) {
    if (!config.enabled) {
      return {};
    }

    int totalFrameShifts = safe_cast<int>(alignment.frameShifts.size());

    const double score = totalFrameShifts > 0 ? 100.0 : 0.0;
    const auto& status = getQcRuleStatus(score);

    return QcResultFrameShifts{
      .score = score,
      .status = status,
      .totalFrameShifts = totalFrameShifts,
    };
  }
}// namespace Nextclade
