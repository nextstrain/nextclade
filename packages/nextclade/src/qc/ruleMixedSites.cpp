#include "ruleMixedSites.h"

#include <frozen/set.h>
#include <nextclade/nextclade.h>

#include <algorithm>
#include <optional>
#include <vector>

#include "../utils/mapFind.h"
#include "getQcRuleStatus.h"

namespace Nextclade {
  namespace {
    constexpr frozen::set<Nucleotide, 6> GOOD_NUCLEOTIDES = {
      Nucleotide::A,
      Nucleotide::C,
      Nucleotide::G,
      Nucleotide::T,
      Nucleotide::N,
      Nucleotide::GAP,
    };
  }//namespace

  std::optional<QCResultMixedSites> ruleMixedSites(//
    const AnalysisResult& result,                 //
    const std::vector<NucleotideSubstitution>&,    //
    const QCRulesConfigMixedSites& config          //
  ) {
    if (!config.enabled) {
      return {};
    }

    int totalMixedSites = 0;
    for (const auto& [nuc, total] : result.nucleotideComposition) {
      if (has(GOOD_NUCLEOTIDES, nuc)) {
        continue;
      }
      totalMixedSites += total;
    }

    const auto score = std::max(0.0, 100.0 * (totalMixedSites / config.mixedSitesThreshold));
    const auto& status = getQcRuleStatus(score);

    return QCResultMixedSites{
      .score = score,
      .status = status,
      .totalMixedSites = totalMixedSites,
      .mixedSitesThreshold = config.mixedSitesThreshold,
    };
  }
}// namespace Nextclade
