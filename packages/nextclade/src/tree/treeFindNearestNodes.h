#pragma once

#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include "TreeNode.h"

namespace Nextclade {
  struct TreeFindNearestNodesResult {
    TreeNode nearestNode;
    std::vector<NucleotideSubstitution> privateMutations;
  };

  TreeFindNearestNodesResult treeFindNearestNodes(
    const NextcladeResultIntermediate& analysisResult, const NucleotideSequence& rootSeq, const Tree& auspiceData);
}// namespace Nextclade
