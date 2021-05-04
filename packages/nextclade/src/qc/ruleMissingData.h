#pragma once

#include <optional>
#include <vector>

namespace Nextclade {
  struct AnalysisResult;
  struct NucleotideSubstitution;
  struct QcResultMissingData;
  struct QCRulesConfigMissingData;

  std::optional<QcResultMissingData> ruleMissingData(    //
    const AnalysisResult& result,                       //
    const std::vector<NucleotideSubstitution>& mutations,//
    const QCRulesConfigMissingData& config               //
  );
}// namespace Nextclade
