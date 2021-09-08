#include "ruleFrameShifts.h"

#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <optional>

#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"

namespace Nextclade {
  std::optional<QcResultFrameShifts> ruleFrameShifts(//
    const AnalysisResult& analysisResult,            //
    const QCRulesConfigFrameShifts& config           //
  ) {
    if (!config.enabled) {
      return {};
    }

    const double score = analysisResult.totalFrameShifts * 75;
    const auto& status = getQcRuleStatus(score);

    return QcResultFrameShifts{
      .score = score,
      .status = status,
      .frameShifts = analysisResult.frameShifts,
      .totalFrameShifts = analysisResult.totalFrameShifts,
    };
  }
}// namespace Nextclade
