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
      return std::pow(ruleResult->score, 2) * 0.01;
    }
    return 0.0;
  }

  QcResult runQc(                                               //
    const AnalysisResult& analysisResult,                      //
    const std::vector<NucleotideSubstitution>& privateMutations,//
    const QcConfig& qcRulesConfig                               //
  ) {
    QcResult result = {
      .missingData = ruleMissingData(analysisResult, privateMutations, qcRulesConfig.missingData),
      .mixedSites = ruleMixedSites(analysisResult, privateMutations, qcRulesConfig.mixedSites),
      .privateMutations = rulePrivateMutations(analysisResult, privateMutations, qcRulesConfig.privateMutations),
      .snpClusters = ruleSnpClusters(analysisResult, privateMutations, qcRulesConfig.snpClusters),
      .overallScore = 0,              // Will be overwritten below
      .overallStatus = QcStatus::good,// Will be overwritten below
    };

    result.overallScore += addScore(result.missingData);
    result.overallScore += addScore(result.mixedSites);
    result.overallScore += addScore(result.privateMutations);
    result.overallScore += addScore(result.snpClusters);

    result.overallStatus = getQcRuleStatus(result.overallScore);

    return result;
  }
}// namespace Nextclade
