#pragma once

#include <vector>
#include <optional>

namespace Nextclade {
  struct NextcladeResult;
  struct NucleotideSubstitution;
  struct QCResultSnpClusters;
  struct QCRulesConfigSnpClusters;

  std::optional<QCResultSnpClusters> ruleSnpClusters(                   //
    const NextcladeResult& result,                       //
    const std::vector<NucleotideSubstitution>& mutations,//
    const QCRulesConfigSnpClusters& config               //
  );
}// namespace Nextclade
