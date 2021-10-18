#pragma once

#include <optional>
#include <vector>

namespace Nextclade {
  struct AnalysisResult;
  struct QcResultMissingData;
  struct QCRulesConfigMissingData;

  std::optional<QcResultMissingData> ruleMissingData(//
    const AnalysisResult& result,                    //
    const QCRulesConfigMissingData& config           //
  );
}// namespace Nextclade
