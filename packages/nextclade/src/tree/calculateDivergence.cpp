#include "calculateDivergence.h"

#include <nextclade/nextclade.h>

#include "../utils/contract.h"
#include "../utils/safe_cast.h"
#include "TreeNode.h"

namespace Nextclade {

  /**
   * Calculates total divergence of the query sequence against reference sequence.
   *
   * Total divergence is a sum of the parent's node divergence and number of private substitutions.
   * Private substitutions are the substitutions that are in the sequence but not in the parent node.
   *
   * The divergence can be expressed in "private mutations per year" ot in "private mutations per year per site"
   * (in the latter case we need to divide the number by number of sites, i.e. the length of the reference sequence)
   */
  double calculateDivergence(       //
    const TreeNode& nearestNode,    //
    const AnalysisResult& result,   //
    DivergenceUnits divergenceUnits,//
    int refSeqLength                //
  ) {
    precondition_equal(result.nearestNodeId, nearestNode.id());// divergence is calculated against the nearest node

    // The parent node has this much divergence
    const double baseDiv = nearestNode.divergence().value_or(0.0);

    // Divergence is just number of substitutions compared to the parent
    auto thisDiv = safe_cast<double>(result.privateSubstitutions.size());

    // If divergence is measured per site, divide by the length of reference sequence.
    // The unit of measurement is deduced from what's already is used in the reference tree nodes.
    if (DivergenceUnits::NumSubstitutionsPerYearPerSite == divergenceUnits) {
      thisDiv /= safe_cast<double>(refSeqLength);
    }

    return baseDiv + thisDiv;
  }
}// namespace Nextclade
