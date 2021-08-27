#pragma once

#include <optional>
#include <vector>

namespace Nextclade {
  struct AnalysisResult;
  struct NucleotideSubstitution;
  struct QCResultSnpClusters;
  struct QCRulesConfigSnpClusters;

  std::optional<QCResultSnpClusters> ruleSnpClusters(    //
    const AnalysisResult& result,                       //
    const std::vector<NucleotideSubstitution>& mutations,//
    const QCRulesConfigSnpClusters& config               //
  );
}// namespace Nextclade
