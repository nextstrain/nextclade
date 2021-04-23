#pragma once

#include <nextclade/nextclade.h>

#include <vector>

namespace Nextclade {
  class Tree;

  void treeAttachNodes(Tree& tree, const NucleotideSequence& rootSeq, const std::vector<NextcladeResult>& results);
}// namespace Nextclade
