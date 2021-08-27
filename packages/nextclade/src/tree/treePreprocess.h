#pragma once

#include <nextclade/nextclade.h>

namespace Nextclade {
  class Tree;

  void treePreprocess(Tree& tree, const NucleotideSequence& rootSeq);
}// namespace Nextclade
