#pragma once

#include <vector>

#include "ruleFrameShifts.h"
#include "ruleMissingData.h"
#include "ruleMixedSites.h"
#include "rulePrivateMutations.h"
#include "ruleSnpClusters.h"
#include "ruleStopCodons.h"

namespace Nextclade {
  struct QcResult;
  struct AnalysisResult;
  struct NucleotideSubstitution;
  struct QcConfig;

  QcResult runQc(                                               //
    const ::NextalignResultInternal& alignment,                   //
    const AnalysisResult& analysisResult,                       //
    const std::vector<NucleotideSubstitution>& privateMutations,//
    const QcConfig& qcRulesConfig                               //
  );                                                            //
}// namespace Nextclade
