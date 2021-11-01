#pragma once

#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include "TreeNode.h"

namespace Nextclade {
  TreeNode treeFindNearestNode(const Tree& tree, const AnalysisResult& analysisResult);
}// namespace Nextclade
