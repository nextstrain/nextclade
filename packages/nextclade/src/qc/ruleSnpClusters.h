#pragma once

#include <optional>
#include <common/safe_vector.h>

namespace Nextclade {
  struct AnalysisResult;
  struct QCResultSnpClusters;
  struct QCRulesConfigSnpClusters;

  std::optional<QCResultSnpClusters> ruleSnpClusters(//
    const AnalysisResult& result,                    //
    const QCRulesConfigSnpClusters& config           //
  );
}// namespace Nextclade
