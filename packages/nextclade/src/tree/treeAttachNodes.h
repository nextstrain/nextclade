#pragma once

#include <nextclade/nextclade.h>

#include <common/safe_vector.h>

namespace Nextclade {
  class Tree;

  void treeAttachNodes(Tree& tree, const safe_vector<AnalysisResult>& results);
}// namespace Nextclade
