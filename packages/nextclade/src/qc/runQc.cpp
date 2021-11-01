#include "runQc.h"

#include <nextclade/nextclade.h>

#include <cmath>
#include <functional>

#include "getQcRuleStatus.h"

namespace Nextclade {

  template<typename T>
  double addScore(const std::optional<T>& ruleResult) {
    if (ruleResult) {
      return std::pow(ruleResult->score, 2) * 0.01;
    }
    return 0.0;
  }

  QcResult runQc(                              //
    const ::NextalignResultInternal& alignment,//
    const AnalysisResult& analysisResult,      //
    const QcConfig& qcRulesConfig              //
  ) {
    QcResult result = {
      .missingData = ruleMissingData(analysisResult, qcRulesConfig.missingData),
      .mixedSites = ruleMixedSites(analysisResult, qcRulesConfig.mixedSites),
      .privateMutations = rulePrivateMutations(analysisResult, qcRulesConfig.privateMutations),
      .snpClusters = ruleSnpClusters(analysisResult, qcRulesConfig.snpClusters),
      .frameShifts = ruleFrameShifts(analysisResult, qcRulesConfig.frameShifts),
      .stopCodons = ruleStopCodons(alignment, qcRulesConfig.stopCodons),
      .overallScore = 0,              // Will be overwritten below
      .overallStatus = QcStatus::good,// Will be overwritten below
    };

    result.overallScore += addScore(result.missingData);
    result.overallScore += addScore(result.mixedSites);
    result.overallScore += addScore(result.privateMutations);
    result.overallScore += addScore(result.snpClusters);
    result.overallScore += addScore(result.frameShifts);
    result.overallScore += addScore(result.stopCodons);

    result.overallStatus = getQcRuleStatus(result.overallScore);

    return result;
  }
}// namespace Nextclade
