#pragma once

#include <nextclade/nextclade.h>

#include <vector>

namespace Nextclade {
  class Tree;

  void treeAttachNodes(Tree& tree, const std::vector<AnalysisResult>& results);
}// namespace Nextclade
