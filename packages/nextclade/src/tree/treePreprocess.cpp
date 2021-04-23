#include "treePreprocess.h"

#include <fmt/format.h>
#include <nextclade/private/nextclade_private.h>

#include "../io/formatMutation.h"
#include "../utils/contract.h"
#include "../utils/mapFind.h"
#include "Tree.h"
#include "TreeNode.h"


namespace Nextclade {

  class ErrorAttachMutationsInconsistentMutation : public std::runtime_error {
  public:
    explicit ErrorAttachMutationsInconsistentMutation(const NucleotideSubstitution& mut, const Nucleotide& previous)
        : std::runtime_error(                                                    //
            fmt::format(                                                         //
              "When attaching mutations: Mutation is inconsistent: \"{}\": "     //
              "current nucleotide: \"{}\", previously seen: \"{}\"",             //
              formatMutation(mut), nucToString(mut.refNuc), nucToString(previous)//
              )                                                                  //
          ) {}
  };

  /**
   * Recursively, in-place, extends nodes with temporary data needed on further stages of the algorithm:
   * attaches a map of substitutions, node type and node ID to every node.
   */
  void treePreprocessInPlaceRecursive(TreeNode& node, std::map<int, Nucleotide>& mutationMap, int& id,
    const NucleotideSequence& rootSeq) {

    std::map<int, Nucleotide> tmpMuts = mutationMap;

    const auto nucleotideMutations = node.nucleotideMutations();
    for (const auto& mut : nucleotideMutations) {
      const auto& previousNuc = mapFind(tmpMuts, mut.pos);
      if (previousNuc.has_value() && (*previousNuc != mut.refNuc)) {
        throw ErrorAttachMutationsInconsistentMutation(mut, *previousNuc);
      }

      // If mutation reverts nucleotide back to what reference had, remove it from the map
      if (rootSeq[mut.pos] == mut.queryNuc) {
        tmpMuts.erase(mut.pos);
      } else {
        tmpMuts[mut.pos] = mut.queryNuc;// NOTE: make sure the entry is overwritten
      }
    }

    // Filter-out gaps
    std::map<int, Nucleotide> substitutions;
    std::copy_if(tmpMuts.cbegin(), tmpMuts.cend(), std::inserter(substitutions, substitutions.end()),
      [](const std::pair<int, Nucleotide> item) { return item.second != Nucleotide::GAP; });

    // Extend node with our temporary data. It will be removed during postprocessing.
    node.setMutations(tmpMuts);
    node.setSubstitutions(substitutions);
    node.setId(id);

    // Node type will not be removed during postprocessing.
    node.setNodeType("Reference");

    // Repeat for children recursively
    node.forEachChildNode([&tmpMuts, &id, &rootSeq](TreeNode& child) {
      ++id;
      treePreprocessInPlaceRecursive(child, tmpMuts, id, rootSeq);
    });
  }

  /**
   * Prepares reference tree in order to prepare it for further algorithm stages.
   * This operation mutates the tree, adding temporary data to nodes. This data will be removed during tree postprocessing.
   */
  void treePreprocess(Tree& tree, const NucleotideSequence& rootSeq) {
    auto root = tree.root();

    std::map<int, Nucleotide> mutationMap;
    int id = 0;
    treePreprocessInPlaceRecursive(root, mutationMap, id, rootSeq);
  }

}// namespace Nextclade
