#pragma once

#include "ruleFrameShifts.h"
#include "ruleMissingData.h"
#include "ruleMixedSites.h"
#include "rulePrivateMutations.h"
#include "ruleSnpClusters.h"
#include "ruleStopCodons.h"

namespace Nextclade {
  struct QcResult;
  struct AnalysisResult;
  struct QcConfig;

  QcResult runQc(                              //
    const ::NextalignResultInternal& alignment,//
    const AnalysisResult& analysisResult,      //
    const QcConfig& qcRulesConfig              //
  );                                           //
}// namespace Nextclade
