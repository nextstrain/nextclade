#include "treePreprocess.h"

#include <fmt/format.h>
#include <nextclade/private/nextclade_private.h>

#include "../utils/at.h"
#include "../utils/mapFind.h"
#include "TreeNode.h"


namespace Nextclade {
  template<typename T>
  inline T copy(const T& t) {
    return T(t);
  }

  class ErrorAttachMutationsInconsistentMutation : public ErrorFatal {
  public:
    ErrorAttachMutationsInconsistentMutation(const NucleotideSubstitution& mut, const Nucleotide& previous)
        : ErrorFatal(                                                         //
            fmt::format(                                                      //
              "When attaching mutations: Mutation is inconsistent: \"{}\": "  //
              "current nucleotide: \"{}\", previously seen: \"{}\"",          //
              formatMutation(mut), nucToString(mut.ref), nucToString(previous)//
              )                                                               //
          ) {}
  };

  class RefPeptideNotFound : public ErrorFatal {
  public:
    explicit RefPeptideNotFound(const std::string& geneName)
        : ErrorFatal(                                                          //
            fmt::format(                                                       //
              "When attaching mutations: Reference peptide not found: \"{}\".",//
              geneName)                                                        //
          ) {}
  };

  template<typename Key, typename Value>
  inline std::map<Key, Value> mapFilter(                              //
    const std::map<Key, Value>& input,                                //
    const std::function<bool(const std::pair<Key, Value>&)>& predicate//
  ) {
    std::map<Key, Value> result;
    std::copy_if(input.cbegin(), input.cend(), std::inserter(result, result.end()), predicate);
    return result;
  }

  inline std::map<int, Nucleotide> filterOutDeletions(const std::map<int, Nucleotide>& input) {
    return mapFilter<int, Nucleotide>(input,
      [](const std::pair<int, Nucleotide>& item) { return item.second != Nucleotide::GAP; });
  }

  inline std::map<std::string, std::map<int, Aminoacid>> filterOutAminoacidDeletions(
    const std::map<std::string, std::map<int, Aminoacid>>& input) {
    auto result = copy(input);
    for (const auto& [geneName, aaMutsForGene] : input) {
      result[geneName] = mapFilter<int, Aminoacid>(result[geneName],
        [](const std::pair<int, Aminoacid>& item) { return item.second != Aminoacid::GAP; });
    }
    return result;
  }

  std::map<int, Nucleotide> mapNucleotideMutations(      //
    const TreeNode& node,                                //
    const NucleotideSequence& rootSeq,                   //
    const std::map<int, Nucleotide>& parentNucMutationMap//
  ) {
    std::map<int, Nucleotide> mutationMap = copy(parentNucMutationMap);

    const auto nucleotideMutations = node.nucleotideMutations();
    for (const auto& mut : nucleotideMutations) {
      const auto& previousNuc = mapFind(mutationMap, mut.pos);
      if (previousNuc.has_value() && (*previousNuc != mut.ref)) {
        throw ErrorAttachMutationsInconsistentMutation(mut, *previousNuc);
      }

      // If mutation reverts nucleotide back to what reference had, remove it from the map
      if (at(rootSeq, mut.pos) == mut.qry) {
        mutationMap.erase(mut.pos);
      } else {
        mutationMap[mut.pos] = mut.qry;// NOTE: make sure the entry is overwritten
      }
    }

    return mutationMap;
  }

  std::map<std::string, std::map<int, Aminoacid>> mapAminoacidMutations(       //
    const TreeNode& node,                                                      //
    const std::map<std::string, RefPeptideInternal>& refPeptides,              //
    const std::map<std::string, std::map<int, Aminoacid>>& parentNucMutationMap//
  ) {
    auto mutationMap = copy(parentNucMutationMap);

    const auto aminoacidMutations = node.aminoacidMutations();
    for (const auto& [geneName, aminoacidMutationsForGene] : aminoacidMutations) {
      for (const auto& mut : aminoacidMutationsForGene) {
        auto previousMapFound = mutationMap.find(geneName);
        if (previousMapFound == mutationMap.end()) {
          mutationMap[geneName] = {};
        }

        previousMapFound = mutationMap.find(geneName);
        auto& mutationMapForGene = previousMapFound->second;

        const auto& previousAa = mapFind(mutationMapForGene, mut.pos);
        if (previousAa.has_value() && (*previousAa != mut.ref)) {
          continue;
        }

        const auto& refPeptide = mapFind(refPeptides, geneName);
        if (!refPeptide) {
          throw RefPeptideNotFound(geneName);
        }

        // If mutation reverts aminoacid back to what reference had, remove it from the map
        const auto ref = at(refPeptide->peptide, mut.pos);
        if (ref == mut.qry) {
          mutationMapForGene.erase(mut.pos);
        } else {
          mutationMapForGene[mut.pos] = mut.qry;// NOTE: make sure the entry is overwritten
        }
      }
    }

    return mutationMap;
  }

  /**
   * Recursively, in-place, extends nodes with temporary data needed on further stages of the algorithm:
   * attaches a map of substitutions, node type and node ID to every node.
   */
  void treePreprocessInPlaceRecursive(                                         //
    const NucleotideSequence& rootSeq,                                         //
    const std::map<std::string, RefPeptideInternal>& refPeptides,              //
    const std::map<int, Nucleotide>& parentNucMutationMap,                     //
    const std::map<std::string, std::map<int, Aminoacid>>& parentAaMutationMap,//
    TreeNode& node,                                                            //
    int& id                                                                    //
  ) {
    const auto nucMutationMap = mapNucleotideMutations(node, rootSeq, parentNucMutationMap);
    const auto nucSubstitutionMap = filterOutDeletions(nucMutationMap);

    const auto aaMutationMap = mapAminoacidMutations(node, refPeptides, parentAaMutationMap);
    const auto aaSubstitutionMap = filterOutAminoacidDeletions(aaMutationMap);

    // Extend node with our temporary data. It will be removed during postprocessing.
    node.setMutations(nucMutationMap);
    node.setSubstitutions(nucSubstitutionMap);
    node.setAaMutations(aaMutationMap);
    node.setAaSubstitutions(aaSubstitutionMap);
    node.setId(id);

    // Node type will not be removed during postprocessing.
    node.setNodeType("Reference");

    // Repeat for children recursively
    node.forEachChildNode([&nucMutationMap, &refPeptides, &aaMutationMap, &id, &rootSeq](TreeNode& child) {
      ++id;
      treePreprocessInPlaceRecursive(rootSeq, refPeptides, nucMutationMap, aaMutationMap, child, id);
    });
  }


  /**
   * Finds maximum divergence value in the tree
   */
  double getMaxDivergenceRecursively(const TreeNode& node) {
    constexpr auto NEGATIVE_INFINITY = -std::numeric_limits<double>::infinity();

    const auto divergence = node.divergence().value_or(NEGATIVE_INFINITY);

    // Repeat for children recursively
    // TODO: can we simplify and use `divergence` variable directly instead of this?
    auto childMaxDivergence = NEGATIVE_INFINITY;
    node.forEachChildNode([&childMaxDivergence](const TreeNode& child) {
      const auto childDivergence = getMaxDivergenceRecursively(child);
      childMaxDivergence = std::max(childDivergence, childMaxDivergence);
    });

    return std::max(divergence, childMaxDivergence);
  }

  /**
   * Guesses the unit of measurement of divergence, based on the greatest value of divergence on the tree
   */
  DivergenceUnits guessDivergenceUnits(double maxDivergence) {
    // FIXME: This should be fixed upstream in augur & auspice, but it is hard to do without breaking Auspice JSON v2 format.
    // Taken from: https://github.com/nextstrain/auspice/blob/6a2d0f276fccf05bfc7084608bb0010a79086c83/src/components/tree/phyloTree/renderers.js#L376
    // A quote from there:
    //  > Prior to Jan 2020, the divergence measure was always "subs per site per year"
    //  > however certain datasets chaged this to "subs per year" across entire sequence.
    //  > This distinction is not set in the JSON, so in order to correctly display the rate
    //  > we will "guess" this here. A future augur update will export this in a JSON key,
    //  > removing the need to guess
    //
    // HACK: Arbitrary threshold to make a guess
    constexpr const auto HACK_MAX_DIVERGENCE_THRESHOLD = 5;
    if (maxDivergence <= HACK_MAX_DIVERGENCE_THRESHOLD) {
      return DivergenceUnits::NumSubstitutionsPerYearPerSite;
    }
    return DivergenceUnits::NumSubstitutionsPerYear;
  }

  /**
   * Prepares reference tree for further algorithm stages.
   * This operation mutates the tree, adding temporary data to nodes. This data will be removed during tree postprocessing.
   */
  void treePreprocess(Tree& tree, const NucleotideSequence& rootSeq,
    const std::map<std::string, RefPeptideInternal>& refPeptides) {
    auto root = tree.root();

    const std::map<int, Nucleotide> nucMutationMap;
    const std::map<std::string, std::map<int, Aminoacid>> aaMutationMap;
    int id = 0;
    treePreprocessInPlaceRecursive(rootSeq, refPeptides, nucMutationMap, aaMutationMap, root, id);

    // TODO: Avoid second full tree iteration by merging it into the one that is just above
    const auto maxDivergence = getMaxDivergenceRecursively(root);
    const auto divergenceUnits = guessDivergenceUnits(maxDivergence);
    tree.setTmpMaxDivergence(maxDivergence);
    tree.setTmpDivergenceUnits(divergenceUnits);
  }

}// namespace Nextclade
