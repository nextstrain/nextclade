#pragma once

#include <nextclade/nextclade.h>

#include <vector>

namespace Nextclade {
  class Tree;

  void treeAttachNodes(Tree& tree, const NucleotideSequence& rootSeq, const std::vector<AnalysisResult>& results);

  struct GetDifferencesResult {
    std::map<std::string, std::vector<std::string>> mutations;
    std::vector<std::string> nucMutations;
    double divergence;
  };

  GetDifferencesResult getDifferences(const AnalysisResult& result, const TreeNode& node,
    const NucleotideSequence& rootSeq, double maxDivergence);
}// namespace Nextclade
