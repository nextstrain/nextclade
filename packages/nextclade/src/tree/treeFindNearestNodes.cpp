#include "treeFindNearestNodes.h"

#include <nextclade/nextclade.h>

#include "../analyze/isSequenced.h"
#include "../utils/mapFind.h"
#include "../utils/safe_cast.h"
#include "TreeNode.h"


namespace Nextclade {
  /**
   * Calculate distance metric between the new node and a candidate reference node
   */
  int calculateDistance(const TreeNode& node, const AnalysisResult& seq) {
    int shared_differences = 0;
    int shared_sites = 0;

    const auto nodeSubstitutions = node.substitutions();

    // Filter-out gaps, to prevent double counting
    for (const auto& qmut : seq.substitutions) {
      const auto der = mapFind(nodeSubstitutions, qmut.pos);
      if (der) {
        // position is also mutated in node
        if (qmut.qry == *der) {
          shared_differences += 1;// the exact mutation is shared between node and seq
        } else {
          shared_sites += 1;// the same position is mutated, but the states are different
        }
      }
    }

    // determine the number of sites that are mutated in the node but missing in seq.
    // for these we can't tell whether the node agrees with seq
    int undetermined_sites = 0;
    for (const auto& nmut : nodeSubstitutions) {
      const int pos = nmut.first;
      if (!isSequenced(pos, seq)) {
        undetermined_sites += 1;
      }
    }

    const auto numMutNode = safe_cast<int>(nodeSubstitutions.size());
    const auto numMutSeq = safe_cast<int>(seq.substitutions.size());

    // calculate distance from set overlaps.
    return numMutNode + numMutSeq - 2 * shared_differences - shared_sites - undetermined_sites;
  }

  struct FindNearestNodeResult {
    int distance;
    TreeNode nearestNode;
  };

  FindNearestNodeResult treeFindNearestNodeRecursively(TreeNode& node, const AnalysisResult& analysisResult) {
    int distance = calculateDistance(node, analysisResult);
    TreeNode nearestNode = TreeNode{node};

    node.forEachChildNode([&analysisResult, &nearestNode, &distance](TreeNode child) {
      auto match = treeFindNearestNodeRecursively(child, analysisResult);
      if (match.distance < distance) {
        distance = match.distance;
        nearestNode = TreeNode{match.nearestNode};
      }
    });

    return {.distance = distance, .nearestNode = TreeNode{nearestNode}};
  }

  /**
   * For a given new sequence, finds a reference tree node that has the least distance metric
   * (as defined by `calculateDistance()`), as well as enumerates sequence's private mutations relative to that node
   */
  TreeNode treeFindNearestNode(const Tree& tree, const AnalysisResult& analysisResult) {
    auto root = tree.root();
    return treeFindNearestNodeRecursively(root, analysisResult).nearestNode;
  }
}// namespace Nextclade
