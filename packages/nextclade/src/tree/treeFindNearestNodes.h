#pragma once

#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include "TreeNode.h"

namespace Nextclade {
  struct TreeFindNearestNodesResult {
    int nearestNodeId;
    std::string nearestNodeClade;
    std::vector<NucleotideSubstitution> privateMutations;
  };

  std::vector<NucleotideSubstitution> findPrivateMutations(const TreeNode& node, const AnalysisResult& seq,
    const NucleotideSequence& rootSeq);

  TreeFindNearestNodesResult treeFindNearestNode(const AnalysisResult& analysisResult,
    const NucleotideSequence& rootSeq, const Tree& tree);
}// namespace Nextclade
