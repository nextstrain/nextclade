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

  TreeFindNearestNodesResult treeFindNearestNode(
    const NextcladeResult& analysisResult, const NucleotideSequence& rootSeq, const Tree& tree);
}// namespace Nextclade
