#pragma once

#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

namespace Nextclade {
  struct TreeFindNearestNodesResult {
    const AuspiceJsonV2TreeNodeExtended& nearestNode;
    std::vector<NucleotideSubstitution> privateMutations;
  };

  TreeFindNearestNodesResult treeFindNearestNodes(const NextcladeResultIntermediate& analysisResult,
    const NucleotideSequence& rootSeq, const AuspiceJsonV2& auspiceData);
}// namespace Nextclade
