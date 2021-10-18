#pragma once

#include <nextclade/nextclade.h>

namespace Nextclade {
  class Tree;
  class TreeNode;

  std::map<int, Nucleotide> mapNucleotideMutations(      //
    const TreeNode& node,                                //
    const NucleotideSequence& rootSeq,                   //
    const std::map<int, Nucleotide>& parentNucMutationMap//
  );

  void treePreprocess(Tree& tree, const NucleotideSequence& rootSeq,
    const std::map<std::string, RefPeptideInternal>& refPeptides);
}// namespace Nextclade
