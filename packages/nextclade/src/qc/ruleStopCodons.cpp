#include "ruleStopCodons.h"

#include <fmt/core.h>
#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <optional>
#include <vector>

#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"

namespace Nextclade {
  std::optional<QcResultStopCodons> ruleStopCodons(//
    const ::NextalignResultInternal& alignment,    //
    const QCRulesConfigStopCodons& config          //
  ) {

    if (!config.enabled) {
      return {};
    }

    int totalStopCodons = 0;
    int problematicStopCodons = 0;
    std::vector<StopCodonLocation> stopCodons;
    for (const auto& peptide : alignment.queryPeptides) {
      auto lengthMinusOne = safe_cast<int>(peptide.seq.size() - 1);// Minus one to ignore valid stop codon at the end
      for (int codon = 0; codon < lengthMinusOne; ++codon) {
        const auto& aa = peptide.seq[codon];
        if (aa == Aminoacid::STOP) {
          auto stopCodon = StopCodonLocation{.geneName = peptide.name, .codon = codon};
          stopCodons.emplace_back(stopCodon);
          totalStopCodons += 1;
          if (!std::count(config.knownStops.begin(), config.knownStops.begin(), stopCodon)) {
            problematicStopCodons += 1;
          }
        }
      }
    }

    const double score = problematicStopCodons > 0 ? 100.0 : 0.0;
    const auto& status = getQcRuleStatus(score);

    return QcResultStopCodons{
      .score = score,
      .status = status,
      .stopCodons = stopCodons,
      .totalStopCodons = totalStopCodons,
      .problematicStopCodons = problematicStopCodons,
    };
  }
}// namespace Nextclade
