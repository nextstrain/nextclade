#include "runQc.h"

#include <nextclade/nextclade.h>

#include <cmath>
#include <functional>
#include <vector>

#include "getQcRuleStatus.h"

namespace Nextclade {

  template<typename T>
  double addScore(const std::optional<T>& ruleResult) {
    if (ruleResult) {
      return std::pow(ruleResult->score, 2);
    }
    return 0.0;
  }

  QcResult runQc(                                               //
    const NextcladeResult& analysisResult,                      //
    const std::vector<NucleotideSubstitution>& privateMutations,//
    const QcConfig& qcRulesConfig                               //
  ) {
    QcResult result = {
      .missingData = ruleMissingData(analysisResult, privateMutations, qcRulesConfig.missingData),
      .mixedSites = ruleMixedSites(analysisResult, privateMutations, qcRulesConfig.mixedSites),
      .privateMutations = rulePrivateMutations(analysisResult, privateMutations, qcRulesConfig.privateMutations),
      .snpClusters = ruleSnpClusters(analysisResult, privateMutations, qcRulesConfig.snpClusters),
    };

    double score = 0;
    score += addScore(result.missingData);
    score += addScore(result.mixedSites);
    score += addScore(result.privateMutations);
    score += addScore(result.snpClusters);

    result.overallScore = score;
    result.overallStatus = getQcRuleStatus(score);

    return result;
  }
}// namespace Nextclade
