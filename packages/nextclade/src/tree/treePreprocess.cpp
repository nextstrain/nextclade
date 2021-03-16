#include "treePreprocess.h"

#include <fmt/format.h>
#include <nextclade/private/nextclade_private.h>
#include <parse/parseMutation.h>
#include <utils/mapFind.h>

#include "Tree.h"


namespace Nextclade {

  class ErrorAttachMutationsInconsistentMutation : public std::runtime_error {
  public:
    explicit ErrorAttachMutationsInconsistentMutation(const NucleotideSubstitution& mut, const Nucleotide& previous)
        : std::runtime_error(                                                //
            fmt::format(                                                     //
              "When attaching mutations: Mutation is inconsistent: \"{}\": " //
              "current nucleotide: \"{}\", previously seen: \"{}\"",         //
              formatMutation(mut), nucToChar(mut.refNuc), nucToChar(previous)//
              )                                                              //
          ) {}
  };

  /**
   * Recursively, in-place, marks all nodes with attribute key: "Node type", value: "Reference"
   */
  void setNodeTypesRecursive(TreeNode& node) {
    node.setNodeAttr("Node type", "Reference");
    auto children = node.children();
    children.forEach([](TreeNode child) { setNodeTypesRecursive(child); });
  }

  /**
   * Recursively, in-place, extends nodes with temporary data needed on further stages of the algorithm:
   * attaches a map of substitutions and node IDs to every node.
   */
  void attachMutationsRecursive(
    TreeNode& node, std::map<int, Nucleotide>& mutationMap, int& id, const NucleotideSequence& rootSeq) {

    std::map<int, Nucleotide> tmpMuts = mutationMap;

    const auto nucleotideMutations = node.nucleotideMutations();
    for (const auto& mut : nucleotideMutations) {
      // TODO: this check seems to be always triggering an exception. Investigate.
      // const auto& previousNuc = mapFind(tmpMuts, mut.pos);
      // if (previousNuc.has_value() && (previousNuc.value() != mut.refNuc)) {
      //   throw ErrorAttachMutationsInconsistentMutation(mut, previousNuc.value());
      // }

      // If mutation reverts nucleotide back to what reference had, remove it from the map
      if (rootSeq[mut.pos] == mut.queryNuc) {
        tmpMuts.erase(mut.pos);
      } else {
        tmpMuts.emplace(mut.pos, mut.queryNuc);
      }
    }

    // Filter-out gaps
    std::map<int, Nucleotide> substitutions;
    std::copy_if(tmpMuts.cbegin(), tmpMuts.cend(), std::inserter(substitutions, substitutions.end()),
      [](const std::pair<int, Nucleotide> item) { return item.second != Nucleotide::GAP; });

    // Extend node with our temporary data. It will be removed during postprocessing.
    node.setNodeAttr("mutations", tmpMuts);
    node.setNodeAttr("substitutions", substitutions);
    node.setNodeAttr("id", id);

    // Repeat for children recursively
    auto children = node.children();
    children.forEach([&tmpMuts, &id, &rootSeq](TreeNode child) {
      ++id;
      attachMutationsRecursive(child, tmpMuts, id, rootSeq);
    });
  }

  /**
   * Prepares reference tree in order to prepare it for further algorithm stages.
   * This operation mutates the tree, adding temporary data to nodes. This data will be removed during tree postprocessing.
   */
  void treePreprocess(Tree& tree, const NucleotideSequence& rootSeq) {
    auto root = tree.root();

    setNodeTypesRecursive(root);

    std::map<int, Nucleotide> mutationMap;
    int id = 0;
    attachMutationsRecursive(root, mutationMap, id, rootSeq);
  }

}// namespace Nextclade
