#pragma once

#include <optional>
#include <vector>

namespace Nextclade {
  struct AnalysisResult;
  struct NucleotideSubstitution;
  struct QcResultPrivateMutations;
  struct QCRulesConfigPrivateMutations;

  std::optional<QcResultPrivateMutations> rulePrivateMutations(//
    const AnalysisResult& result,                             //
    const std::vector<NucleotideSubstitution>& mutations,      //
    const QCRulesConfigPrivateMutations& config                //
  );
}// namespace Nextclade
