#include "ruleMissingData.h"

#include <nextclade/nextclade.h>

#include <optional>
#include <vector>

#include "../utils/mapFind.h"
#include "getQcRuleStatus.h"

namespace Nextclade {
  std::optional<QcResultMissingData> ruleMissingData(//
    const AnalysisResult& result,                    //
    const std::vector<NucleotideSubstitution>&,      //
    const QCRulesConfigMissingData& config           //
  ) {
    if (!config.enabled) {
      return {};
    }

    const auto totalMissing = mapFind(result.nucleotideComposition, Nucleotide::N).value_or(0);

    const auto score = std::max(0.0, ((totalMissing - config.scoreBias) * 100) / config.missingDataThreshold);
    const auto& status = getQcRuleStatus(score);

    return QcResultMissingData{
      .score = score,
      .status = status,
      .totalMissing = totalMissing,
      .missingDataThreshold = config.missingDataThreshold + config.scoreBias,// FIXME: Quite confusing. Why is that so?
    };
  }

}// namespace Nextclade
