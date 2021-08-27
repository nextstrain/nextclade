#include "rulePrivateMutations.h"

#include <nextclade/nextclade.h>

#include <optional>
#include <vector>

#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"

namespace Nextclade {
  std::optional<QcResultPrivateMutations> rulePrivateMutations( //
    const AnalysisResult& result,                              //
    const std::vector<NucleotideSubstitution>& privateMutations,//
    const QCRulesConfigPrivateMutations& config                 //
  ) {
    if (!config.enabled) {
      return {};
    }

    const auto& insertions = result.insertions;
    const auto& deletions = result.deletions;
    const auto totalNumberOfMutations =
      safe_cast<double>(privateMutations.size() + insertions.size() + deletions.size());

    // the score hits 100 if the excess mutations equals the cutoff value
    const auto score = (std::max(0.0, totalNumberOfMutations - config.typical) * 100.0) / config.cutoff;
    const auto& status = getQcRuleStatus(score);

    return QcResultPrivateMutations{
      .score = score,
      .status = status,
      .total = totalNumberOfMutations,
      .excess = totalNumberOfMutations - config.typical,
      .cutoff = config.cutoff,
    };
  }
}// namespace Nextclade
