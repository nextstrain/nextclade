#pragma once

#include <vector>
#include <optional>

namespace Nextclade {
  struct NextcladeResult;
  struct NucleotideSubstitution;
  struct QCResultMixedSites;
  struct QCRulesConfigMixedSites;

  std::optional<QCResultMixedSites> ruleMixedSites(                     //
    const NextcladeResult& result,                       //
    const std::vector<NucleotideSubstitution>& mutations,//
    const QCRulesConfigMixedSites& config                //
  );
}// namespace Nextclade
