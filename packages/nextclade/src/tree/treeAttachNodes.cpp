#include "treeAttachNodes.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <vector>

#include "../io/formatMutation.h"
#include "../io/formatQcStatus.h"
#include "../utils/contract.h"
#include "TreeNode.h"
#include "findPrivateMutations.h"


namespace Nextclade {
  namespace {
    // HACK: keep space at the end: workaround for Auspice filtering out "Unknown"
    // https://github.com/nextstrain/auspice/blob/797090f8092ffe1291b58efd113d2c5def8b092a/src/util/globals.js#L182
    constexpr const char* const UNKNOWN_VALUE = "Unknown ";

    template<typename Container, typename Formatter, typename Delimiter>
    std::string formatAndJoinMaybeEmpty(const Container& elements, Formatter formatter, Delimiter delimiter) {
      if (elements.empty()) {
        return "None";
      }
      return formatAndJoin(elements, formatter, delimiter);
    }

    template<typename T>
    inline const T& identity(const T& t) noexcept {
      return t;
    }
  }// namespace

  void addAuxiliaryNode(TreeNode& node) {
    precondition_equal(node.isLeaf(), true);         // Only add aux node to leaf nodes
    precondition_equal(node.isReferenceNode(), true);// Only add aux node to a reference node

    TreeNode aux = node.addChildFromCopy(node);
    aux.setNucleotideMutationsEmpty();

    node.setName(fmt::format("{}_parent", aux.name()));
    node.removeNodeAttr("author");
    node.removeNodeAttr("url");
  }

  void addChild(TreeNode& node, const AnalysisResult& result) {
    auto newNode = node.addChild();

    newNode.setName(fmt::format("{}_new", result.seqName));
    newNode.setClade(result.clade);
    newNode.setNodeType("New");
    newNode.setBranchAttrMutations(result.privateNucMutations, result.privateAaMutations);
    newNode.setDivergence(result.divergence);
    newNode.setNodeAttr("region", UNKNOWN_VALUE);
    newNode.setNodeAttr("country", UNKNOWN_VALUE);
    newNode.setNodeAttr("division", UNKNOWN_VALUE);

    newNode.setNodeAttr("Alignment",
      fmt::format("start: {}, end: {} (score: {})", result.alignmentStart, result.alignmentEnd, result.alignmentScore));

    newNode.setNodeAttr("Missing", formatAndJoinMaybeEmpty(result.missing, formatMissing, ", "));

    newNode.setNodeAttr("Gaps", formatAndJoinMaybeEmpty(result.deletions, formatDeletion, ", "));

    newNode.setNodeAttr("Non-ACGTNs", formatAndJoinMaybeEmpty(result.nonACGTNs, formatNonAcgtn, ", "));

    newNode.setNodeAttr("Has PCR primer changes", result.totalPcrPrimerChanges > 0 ? "Yes" : "No");

    if (result.totalPcrPrimerChanges > 0) {
      newNode.setNodeAttr("PCR primer changes",
        formatAndJoinMaybeEmpty(result.pcrPrimerChanges, formatPcrPrimerChange, ", "));
    }

    newNode.setNodeAttr("QC Status", formatQcStatus(result.qc.overallStatus));

    newNode.setNodeAttr("Missing genes", formatAndJoinMaybeEmpty(result.missingGenes, identity<std::string>, ", "));
  }

  /**
   * Attaches a new node to the reference tree
   */
  void attachNewNode(TreeNode& node, const AnalysisResult& result) {
    precondition_equal(node.isReferenceNode(), true);   // Attach only to a reference node
    precondition_equal(node.id(), result.nearestNodeId);// Attach only to the matching node

    if (node.isLeaf()) {
      addAuxiliaryNode(node);
    }

    addChild(node, result);
  }

  /**
   * Attaches new nodes to the nearest reference tree nodes,
   * according to the results of the nearest node search we ran previously for every sequence
   */
  void attachNewNodesRecursively(TreeNode& node, const std::vector<AnalysisResult>& results) {
    // Attach only to a reference node.
    // If it's not a reference node, we can stop here, because there can be no reference nodes down the tree.
    if (!node.isReferenceNode()) {
      return;
    }

    // Repeat for children recursively
    node.forEachChildNode([&results](TreeNode& child) { attachNewNodesRecursively(child, results); });

    // We look for a matching result, by it's unique `id`
    for (const auto& result : results) {
      if (node.id() == result.nearestNodeId) {
        attachNewNode(node, result);
      }
    }
  }

  void treeAttachNodes(Tree& tree, const std::vector<AnalysisResult>& results) {
    auto rootNode = tree.root();
    attachNewNodesRecursively(rootNode, results);
  }
}// namespace Nextclade
