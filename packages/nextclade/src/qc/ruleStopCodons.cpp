#include "ruleStopCodons.h"

#include <fmt/core.h>
#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <optional>
#include <vector>

#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"

namespace Nextclade {
  namespace details {
    bool isIgnoredStopCodon(const StopCodonLocation& stopCodon,
      const std::vector<StopCodonLocation>& ignoredStopCodons) {
      return std::any_of(ignoredStopCodons.cbegin(), ignoredStopCodons.end(),
        [&stopCodon](const StopCodonLocation& ignoredStopCodon) { return stopCodon == ignoredStopCodon; });
    }
  }// namespace details


  std::optional<QcResultStopCodons> ruleStopCodons(//
    const ::NextalignResultInternal& alignment,    //
    const QCRulesConfigStopCodons& config          //
  ) {

    if (!config.enabled) {
      return {};
    }

    int totalStopCodons = 0;
    std::vector<StopCodonLocation> stopCodons;
    for (const auto& peptide : alignment.queryPeptides) {
      auto lengthMinusOne = safe_cast<int>(peptide.seq.size() - 1);// Minus one to ignore valid stop codon at the end

      for (int codon = 0; codon < lengthMinusOne; ++codon) {
        const auto& aa = peptide.seq[codon];
        if (aa == Aminoacid::STOP) {
          auto stopCodon = StopCodonLocation{.geneName = peptide.name, .codon = codon};
          if (!details::isIgnoredStopCodon(stopCodon, config.ignoredStopCodons)) {
            totalStopCodons += 1;
            stopCodons.emplace_back(stopCodon);
          }
        }
      }
    }

    const double score = totalStopCodons * 75;
    const auto& status = getQcRuleStatus(score);

    return QcResultStopCodons{
      .score = score,
      .status = status,
      .stopCodons = stopCodons,
      .totalStopCodons = totalStopCodons,
    };
  }
}// namespace Nextclade
