#include "rulePrivateMutations.h"

#include <common/safe_vector.h>
#include <nextclade/nextclade.h>

#include <algorithm>
#include <optional>
#include <type_traits>

#include "../analyze/findDeletionRanges.h"
#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"
#include "utils/map.h"

namespace Nextclade {
  NucleotideDeletionSimple removeLabelsFromDel(const NucleotideDeletionSimpleLabeled& labeled) {
    return labeled.deletion;
  }

  safe_vector<NucleotideDeletionSimple> removeLabelsFromDels(
    const safe_vector<NucleotideDeletionSimpleLabeled>& labeled) {
    return map_vector<NucleotideDeletionSimpleLabeled, NucleotideDeletionSimple>(labeled, removeLabelsFromDel);
  }

  std::optional<QcResultPrivateMutations> rulePrivateMutations(//
    const AnalysisResult& result,                              //
    const QCRulesConfigPrivateMutations& config                //
  ) {
    if (!config.enabled) {
      return {};
    }

    // Note that we count *individual* nucleotide substitutions, but contiguous *ranges* of deletions.
    // That is, a 2 adjacent substitutions give a total of 2, but 2 adjacent deletions give a total of 1.

    const auto numReversionSubstitutions = safe_cast<int>(result.privateNucMutations.reversionSubstitutions.size());
    const auto numLabeledSubstitutions = safe_cast<int>(result.privateNucMutations.labeledSubstitutions.size());
    const auto numUnlabeledSubstitutions = safe_cast<int>(result.privateNucMutations.unlabeledSubstitutions.size());

    const auto deletionRanges = findDeletionRanges(result.privateNucMutations.privateDeletions);
    const auto totalDeletionRanges = safe_cast<int>(deletionRanges.size());

    const auto weightedTotal =                                         //
      0.0                                                              //
      + config.weightReversionSubstitutions * numReversionSubstitutions//
      + config.weightLabeledSubstitutions * numLabeledSubstitutions    //
      + config.weightUnlabeledSubstitutions * numUnlabeledSubstitutions//
      + totalDeletionRanges                                            //
      ;

    // the score hits 100 if the excess mutations equals the cutoff value
    const auto score = (std::max(0.0, weightedTotal - config.typical) * 100.0) / config.cutoff;
    const auto& status = getQcRuleStatus(score);

    return QcResultPrivateMutations{
      .score = score,
      .status = status,
      .numReversionSubstitutions = numReversionSubstitutions,
      .numLabeledSubstitutions = numLabeledSubstitutions,
      .numUnlabeledSubstitutions = numUnlabeledSubstitutions,
      .totalDeletionRanges = totalDeletionRanges,
      .weightedTotal = weightedTotal,
      .excess = weightedTotal - config.typical,
      .cutoff = config.cutoff,
    };
  }
}// namespace Nextclade
