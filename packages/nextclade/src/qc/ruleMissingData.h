#pragma once

#include <optional>
#include <common/safe_vector.h>

namespace Nextclade {
  struct AnalysisResult;
  struct QcResultMissingData;
  struct QCRulesConfigMissingData;

  std::optional<QcResultMissingData> ruleMissingData(//
    const AnalysisResult& result,                    //
    const QCRulesConfigMissingData& config           //
  );
}// namespace Nextclade
