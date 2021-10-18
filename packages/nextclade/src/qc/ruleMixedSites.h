#pragma once

#include <optional>
#include <vector>

namespace Nextclade {
  struct AnalysisResult;
  struct QCResultMixedSites;
  struct QCRulesConfigMixedSites;

  std::optional<QCResultMixedSites> ruleMixedSites(//
    const AnalysisResult& result,                  //
    const QCRulesConfigMixedSites& config          //
  );
}// namespace Nextclade
