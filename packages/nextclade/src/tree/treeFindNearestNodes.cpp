#include "treeFindNearestNodes.h"

#include <nextclade/nextclade.h>

#include <algorithm>
#include <optional>

#include "../utils/contract.h"
#include "../utils/inRange.h"
#include "../utils/mapFind.h"
#include "../utils/safe_cast.h"


namespace Nextclade {
  struct FindPrivateMutationsResult {};

  FindPrivateMutationsResult findPrivateMutations() {
    return {};
  }

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

  int calculateDistance(const AuspiceJsonV2TreeNodeExtended& node, const NextcladeResultIntermediate& seq) {
    int shared_differences = 0;
    int shared_sites = 0;

    // Filter-out gaps, to prevent double counting
    for (const auto& qmut : seq.substitutions) {
      const auto der = mapFind(node.substitutions, qmut.pos);
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
    for (const auto& nmut : node.substitutions) {
      const int pos = nmut.first;
      if (!isSequenced(pos, seq)) {
        undetermined_sites += 1;
      }
    }

    const auto numMutNode = safe_cast<int>(node.substitutions.size());
    const auto numMutSeq = safe_cast<int>(seq.substitutions.size());

    // calculate distance from set overlaps.
    return numMutNode + numMutSeq - 2 * shared_differences - shared_sites - undetermined_sites;
  }

  struct ClosestMatchResult {
    int distance;
    const AuspiceJsonV2TreeNodeExtended& nearestNode;
  };

  ClosestMatchResult treeFindNearestNodeRecursively(
    const AuspiceJsonV2TreeNodeExtended& node, const NextcladeResultIntermediate& analysisResult) {

    const int distance = calculateDistance(node, analysisResult);
    const auto& nearestNode = node;
    const auto& children = node.children;

    // TODO: Only consider nodes of the reference tree, skip newly added nodes
    // const refChildren = children.filter((node) => node.node_attrs?.['Node type'].value !== NodeType.New)
    const auto& refChildren = children;

    for (const AuspiceJsonV2TreeNodeExtended& child : *refChildren) {
      const auto match = treeFindNearestNodeRecursively(child, analysisResult);
      if (match.distance < distance) {
        distance = match.distance;
        nearestNode = match.nearestNode;
      }
    }

    return {.distance = distance, .nearestNode = nearestNode};
  }

  /**
   * Finds mutations that are present in the new sequence, but not present in the matching reference node sequence
   */
  std::vector<NucleotideSubstitution> findPrivateMutations(const AuspiceJsonV2TreeNodeExtended& node,
    const NextcladeResultIntermediate& seq, const NucleotideSequence& root_seq) {
    // `std::set_difference` requires containers to be sorted
    precondition(std::is_sorted(node.substitutions.cbegin(), node.substitutions.cend()));
    precondition(std::is_sorted(seq.substitutions.cbegin(), seq.substitutions.cend()));

    const std::set<int> mutatedPositions;
    std::for_each(seq.substitutions.cbegin(), seq.substitutions.cend(),
      [&mutatedPositions](const auto& sub) { mutatedPositions.insert(sub.pos); });

    std::vector<NucleotideSubstitution> privateMutations;
    std::set_difference(                                     //
      node.substitutions.cbegin(), node.substitutions.cend(),//
      seq.substitutions.cbegin(), seq.substitutions.cend(),  //
      privateMutations.begin()                               //
    );

    for (const auto& [pos, refNuc] : node.substitutions) {
      if (has(mutatedPositions, pos) && isSequenced(pos, seq)) {
        const auto queryNuc = root_seq[pos];
        privateMutations.push_back(NucleotideSubstitution{.pos = pos, .refNuc = refNuc, .queryNuc = queryNuc});
      }
    }

    return privateMutations;
  }


  TreeFindNearestNodesResult treeFindNearestNodes(const NextcladeResultIntermediate& analysisResult,
    const NucleotideSequence& rootSeq, const AuspiceJsonV2& auspiceData) {
    const AuspiceJsonV2TreeNodeExtended& focalNode = auspiceData.tree;
    const auto nearestNode = treeFindNearestNodeRecursively(focalNode, analysisResult).nearestNode;
    const auto privateMutations = findPrivateMutations(nearestNode, analysisResult, rootSeq);
    return {.nearestNode = nearestNode, .privateMutations = privateMutations};
  }
}// namespace Nextclade
