#pragma once

#include <optional>
#include <vector>

namespace Nextclade {
  struct AnalysisResult;
  struct NucleotideSubstitution;
  struct QCResultMixedSites;
  struct QCRulesConfigMixedSites;

  std::optional<QCResultMixedSites> ruleMixedSites(      //
    const AnalysisResult& result,                       //
    const std::vector<NucleotideSubstitution>& mutations,//
    const QCRulesConfigMixedSites& config                //
  );
}// namespace Nextclade
