#pragma once

#include <nextclade/nextclade.h>

namespace Nextclade {
  class Tree;

  void treePreprocess(Tree& tree, const NucleotideSequence& rootSeq,
    const std::map<std::string, RefPeptideInternal>& refPeptides);
}// namespace Nextclade
