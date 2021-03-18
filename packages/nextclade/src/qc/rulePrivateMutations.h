#pragma once

#include <vector>
#include <optional>

namespace Nextclade {
  struct NextcladeResult;
  struct NucleotideSubstitution;
  struct QcResultPrivateMutations;
  struct QCRulesConfigPrivateMutations;

  std::optional<QcResultPrivateMutations> rulePrivateMutations(         //
    const NextcladeResult& result,                       //
    const std::vector<NucleotideSubstitution>& mutations,//
    const QCRulesConfigPrivateMutations& config          //
  );
}// namespace Nextclade
