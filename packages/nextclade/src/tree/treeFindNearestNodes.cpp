#include "treeFindNearestNodes.h"

#include <nextclade/nextclade.h>

#include <algorithm>

#include "../utils/inRange.h"
#include "../utils/mapFind.h"
#include "../utils/safe_cast.h"
#include "Tree.h"
#include "TreeNode.h"


namespace Nextclade {
  /**
   * Checks if a nucleotide at a given position is sequenced
   */
  bool isSequenced(int pos, const NextcladeResultIntermediate& analysisResult) {
    // Make sure position does not belong to a missing fragment
    for (const auto& missing : analysisResult.missing) {
      if (inRange(pos, missing.begin, missing.end)) {
        return false;
      }
    }

    // Make sure position belongs to alignment range
    return inRange(pos, analysisResult.alignmentStart, analysisResult.alignmentEnd);
  }

  /**
   * Calculate distance metric between the new node and a candidate reference node
   */
  int calculateDistance(const TreeNode& node, const NextcladeResultIntermediate& seq) {
    int shared_differences = 0;
    int shared_sites = 0;

    const auto nodeSubstitutions = node.substitutions();

    // Filter-out gaps, to prevent double counting
    for (const auto& qmut : seq.substitutions) {
      const auto der = mapFind(nodeSubstitutions, qmut.pos);
      if (der) {
        // position is also mutated in node
        if (qmut.queryNuc == *der) {
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

  struct ClosestMatchResult {
    int distance;
    TreeNode nearestNode;
  };

  ClosestMatchResult treeFindNearestNodeRecursively(
    const TreeNode& node, const NextcladeResultIntermediate& analysisResult) {

    int distance = calculateDistance(node, analysisResult);
    auto nearestNode = node;
    auto children = node.children();

    // TODO: Only consider nodes of the reference tree, skip newly added nodes
    // const refChildren = children.filter((node) => node.node_attrs?.['Node type'].value !== NodeType.New)
    auto refChildren = children.filter([](const TreeNode& child) {
      (void) child;
      return true;
    });

    refChildren.forEach([&analysisResult, &nearestNode, &distance](const TreeNode& child) {
      auto match = treeFindNearestNodeRecursively(child, analysisResult);
      if (match.distance < distance) {
        distance = match.distance;
        nearestNode = match.nearestNode;
      }
    });

    return {.distance = distance, .nearestNode = nearestNode};
  }

  /**
   * Finds mutations that are present in the new sequence, but not present in the matching reference tree node
   */
  std::vector<NucleotideSubstitution> findPrivateMutations(
    const TreeNode& node, const NextcladeResultIntermediate& seq, const NucleotideSequence& rootSeq) {

    const auto nodeSubstitutions = node.substitutions();
    const auto& seqSubstitutions = seq.substitutions;

    std::vector<NucleotideSubstitution> privateMutations;
    for (const auto& sub : seqSubstitutions) {
      const auto nodeSub = mapFind(nodeSubstitutions, sub.pos);
      if (*nodeSub == sub.queryNuc) {
        privateMutations.push_back(sub);
      }
    }

    std::set<int> mutatedPositions;
    for (auto sub : seqSubstitutions) {
      mutatedPositions.insert(sub.pos);
    }

    for (const auto [pos, refNuc] : nodeSubstitutions) {
      if (!has(mutatedPositions, pos) && isSequenced(pos, seq)) {
        const auto& queryNuc = rootSeq[pos];
        privateMutations.push_back({pos, refNuc, queryNuc});
      }
    }

    return privateMutations;
  }

  /**
   * For a given new sequence, finds a reference tree node that has the least distance metric
   * (as defined by `calculateDistance()`), as well as enumerates sequence's private mutations relative to that node
   */
  TreeFindNearestNodesResult treeFindNearestNode(
    const NextcladeResultIntermediate& analysisResult, const NucleotideSequence& rootSeq, const Tree& tree) {

    const auto focalNode = tree.root();

    const auto nearestNode = treeFindNearestNodeRecursively(focalNode, analysisResult).nearestNode;
    const auto privateMutations = findPrivateMutations(nearestNode, analysisResult, rootSeq);

    return {.nearestNode = nearestNode, .privateMutations = privateMutations};
  }
}// namespace Nextclade
