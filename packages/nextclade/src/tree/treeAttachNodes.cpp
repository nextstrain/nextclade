#include "treeAttachNodes.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <limits>
#include <vector>

#include "../analyze/isSequenced.h"
#include "../io/formatMutation.h"
#include "../io/formatQcStatus.h"
#include "../io/parseMutation.h"
#include "../utils/contract.h"
#include "../utils/eraseDuplicates.h"
#include "../utils/mapFind.h"
#include "Tree.h"
#include "TreeNode.h"

namespace Nextclade {
  namespace {
    constexpr auto NEGATIVE_INFINITY = -std::numeric_limits<double>::infinity();

    // HACK: keep space at the end: workaround for Auspice filtering out "Unknown"
    constexpr const char* const UNKNOWN_VALUE = "Unknown ";

    template<typename T, typename Formatter, typename Delimiter>
    std::string formatAndJoinMaybeEmpty(const std::vector<T>& elements, Formatter formatter, Delimiter delimiter) {
      if (elements.empty()) {
        return "None";
      }
      return formatAndJoin(elements, formatter, delimiter);
    }

    struct AminoacidMutationEntry {
      NucleotideSequence gene;
      NucleotideSequence aaMut;
    };

    bool operator==(const AminoacidMutationEntry& left, const AminoacidMutationEntry& right) {
      return left.gene == right.gene && left.aaMut == right.aaMut;
    }

    bool operator<(const AminoacidMutationEntry& left, const AminoacidMutationEntry& right) {
      return left.gene < right.gene || left.aaMut < right.aaMut;
    }

    struct GetDifferencesResult {
      std::map<std::string, std::vector<std::string>> mutations;
      std::vector<std::string> nucMutations;
      double divergence;
    };

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

  // TODO: implement this
  std::map<std::string, std::vector<std::string>> groupAminoacidMutations(
    const std::vector<AminoacidMutationEntry>& aminoacidMutationEntries) {

    (void) aminoacidMutationEntries;

    //  const aminoacidMutationsGrouped = groupBy(aminoacidMutationEntries, ({ gene }) => gene)
    //  const aminoacidMutationsFinal = mapValues(aminoacidMutationsGrouped, (aaMuts) => aaMuts.map(({ aaMut }) => aaMut))
    //  const mutations = {
    //    nuc: nucMutations,
    //    ...aminoacidMutationsFinal,
    //  }
    return {};
  }

  GetDifferencesResult getDifferences(const NextcladeResult& result, const TreeNode& node,
    const NucleotideSequence& rootSeq, double maxDivergence) {
    const auto nodeMutations = node.mutations();

    std::set<int> positionsCovered;
    std::vector<AminoacidMutationEntry> aminoacidMutationEntries;

    int totalNucMutations = 0;

    std::vector<std::string> nucMutations;
    nucMutations.reserve(result.substitutions.size());

    for (const auto& qmut : result.substitutions) {
      const auto& pos = qmut.pos;
      const auto& queryNuc = qmut.queryNuc;
      positionsCovered.insert(pos);
      const auto der = mapFind(nodeMutations, pos);

      std::optional<Nucleotide> refNuc;
      if (der) {
        if (queryNuc != der) {
          // shared site but states of node and seq differ
          refNuc = der;
        }
      } else {
        // node does not have a mutation, but seq does -> compare to root
        refNuc = rootSeq[pos];
      }

      if (refNuc) {
        const auto mut = formatMutation(NucleotideSubstitution{
          .refNuc = *refNuc,
          .pos = pos,
          .queryNuc = queryNuc,
          .pcrPrimersChanged = {},
          .aaSubstitutions = {},
        });
        nucMutations.push_back(mut);
        totalNucMutations += 1;

        // TODO: convert this JS code to C++
        // TODO: these are amino acid mutations relative to reference. Double hits won't how up properly
        //  const aminoacidMutationEntriesNew = qmut.aaSubstitutions.map(({ codon, gene, queryAA, refAA }) => {
        //    const aaMut = formatAAMutationWithoutGene({ refAA, codon, queryAA })
        //    return { gene, aaMut }
        //  })
        //
        //  aminoacidMutationEntries = [...aminoacidMutationEntries, ...aminoacidMutationEntriesNew]
      }
    }

    for (const auto& del : result.deletions) {
      const auto& start = del.start;
      const auto& end = del.start + del.length;

      for (int pos = start; pos < end; ++pos) {
        const auto& queryNuc = Nucleotide::GAP;
        const auto& der = mapFind(nodeMutations, pos);
        positionsCovered.insert(pos);

        std::optional<Nucleotide> refNuc;
        if (der) {
          if (queryNuc != der) {
            // shared site but states of node and seq differ
            refNuc = der;
          }
        } else {
          // node does not have a mutation, but seq does -> compare to root
          refNuc = rootSeq[pos];
        }

        if (refNuc) {
          const auto mut = formatMutation(NucleotideSubstitution{
            .refNuc = *refNuc,
            .pos = pos,
            .queryNuc = queryNuc,
            .pcrPrimersChanged = {},
            .aaSubstitutions = {},
          });
          nucMutations.push_back(mut);

          // TODO: convert this JS code to C++
          //  const aminoacidMutationEntriesNew = del.aaDeletions.map(({ codon, gene, refAA }) => {
          //    const aaMut = formatAAMutationWithoutGene({ refAA, codon, queryAA: AMINOACID_GAP })
          //    return { gene, aaMut }
          //  })
          //  aminoacidMutationEntries = [...aminoacidMutationEntries, ...aminoacidMutationEntriesNew]
        }
      }
    }

    eraseDuplicatesInPlace(aminoacidMutationEntries);
    const auto mutations = groupAminoacidMutations(aminoacidMutationEntries);


    for (const auto& [pos, nuc] : nodeMutations) {
      // mutation in node that is not present in node
      if (!has(positionsCovered, pos) && isSequenced(pos, result) && nuc != Nucleotide::GAP) {
        const auto& refNuc = rootSeq[pos];
        // TODO: is there no mistake in nucleotides here?
        const auto& mutStr = formatMutation(NucleotideSubstitution{
          .refNuc = nuc,
          .pos = pos,
          .queryNuc = refNuc,
          .pcrPrimersChanged = {},
          .aaSubstitutions = {},
        });
        nucMutations.push_back(mutStr);
        totalNucMutations += 1;
      }
    }


    const double baseDiv = node.divergence().value_or(0.0);
    // HACK: Guess the unit of measurement of divergence.
    // Taken from: https://github.com/nextstrain/auspice/blob/6a2d0f276fccf05bfc7084608bb0010a79086c83/src/components/tree/phyloTree/renderers.js#L376
    // FIXME: Should be resolved upstream in augur/auspice.
    constexpr const auto HACK_MAX_DIVERGENCE_THRESHOLD = 5;
    double thisDiv = totalNucMutations;// unit: number of substitutions
    if (maxDivergence <= HACK_MAX_DIVERGENCE_THRESHOLD) {
      thisDiv /= rootSeq.size();// unit: number of substitutions per site
    }

    const double divergence = baseDiv + thisDiv;

    nucMutations.shrink_to_fit();

    return {
      .mutations = mutations,
      .nucMutations = nucMutations,
      .divergence = divergence,
    };
  }

  void addChild(TreeNode& node, const NextcladeResult& result,
    const std::map<std::string, std::vector<std::string>>& mutations, const std::vector<std::string>& nucMutations,
    double divergence) {

    auto newNode = node.addChild();

    newNode.setName(fmt::format("{}_new", result.seqName));
    newNode.setClade(result.clade);
    newNode.setNodeType("New");
    newNode.setBranchAttrMutations(mutations);
    newNode.setDivergence(divergence);
    newNode.setNodeAttr("region", UNKNOWN_VALUE);
    newNode.setNodeAttr("country", UNKNOWN_VALUE);
    newNode.setNodeAttr("division", UNKNOWN_VALUE);

    newNode.setNodeAttr("Alignment",
      fmt::format("start: {}, end: {} (score: {})", result.alignmentStart, result.alignmentEnd, result.alignmentScore));

    newNode.setNodeAttr("Missing", formatAndJoinMaybeEmpty(result.missing, formatMissing, ", "));

    newNode.setNodeAttr("Gaps", formatAndJoinMaybeEmpty(result.deletions, formatDeletion, ", "));

    newNode.setNodeAttr("Non-ACGTNs", formatAndJoinMaybeEmpty(result.nonACGTNs, formatNonAcgtn, ", "));

    newNode.setNodeAttr("Has PCR primer changes", result.totalPcrPrimerChanges > 0 ? "Yes" : "No");

    newNode.setNodeAttr("PCR primer changes",
      formatAndJoinMaybeEmpty(result.pcrPrimerChanges, formatPcrPrimerChange, ", "));

    newNode.setNodeAttr("QC Status", formatQcStatus(result.qc.overallStatus));

    newNode.setNodeAttr("QC Flags", formatQcFlags(result.qc));

    auto tempMutations = node.mutations();
    for (const auto& mutStr : nucMutations) {
      // TODO: This parsing seems redundant. Can we avoid converting these to strings in upstream code?
      // TODO: Can we move this away from here, closer to where mutations are produced!
      const auto mut = parseMutation(mutStr);
      tempMutations.insert(std::make_pair(mut.pos, mut.queryNuc));
    }
    newNode.setMutations(tempMutations);
  }

  /**
   * Attaches a new node to the reference tree
   */
  void attachNewNode(const NextcladeResult& result, TreeNode& node, const NucleotideSequence& rootSeq,
    double maxDivergence) {
    precondition_equal(node.isReferenceNode(), true);   // Attach only to a reference node
    precondition_equal(node.id(), result.nearestNodeId);// Attach only to the matching node

    const auto& [mutations, nucMutations, divergence] = getDifferences(result, node, rootSeq, maxDivergence);

    if (node.isLeaf()) {
      addAuxiliaryNode(node);
    }
    addChild(node, result, mutations, nucMutations, divergence);
  }

  /**
   * Attaches new nodes to the nearest reference tree nodes,
   * according to the results of the nearest node search we ran previously for every sequence
   */
  void attachNewNodesRecursively(TreeNode& node, const std::vector<NextcladeResult>& results,
    const NucleotideSequence& rootSeq, double maxDivergence) {
    // Attach only to a reference node.
    // If it's not a reference node, we can stop here, because there can be no reference nodes down the tree.
    if (!node.isReferenceNode()) {
      return;
    }

    // Repeat for children recursively
    node.forEachChildNode([&results, &rootSeq, &maxDivergence](TreeNode& child) {//
      attachNewNodesRecursively(child, results, rootSeq, maxDivergence);         //
    });

    // We look for a matching result, by it's unique `id`
    for (const auto& result : results) {
      if (node.id() == result.nearestNodeId) {
        attachNewNode(result, node, rootSeq, maxDivergence);
      }
    }
  }

  /**
   * Finds maximum divergence value in the tree
   */
  double getMaxDivergenceRecursively(const TreeNode& node) {
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

  void treeAttachNodes(Tree& tree, const NucleotideSequence& rootSeq, const std::vector<NextcladeResult>& results) {
    auto rootNode = tree.root();
    const auto maxDivergence = getMaxDivergenceRecursively(rootNode);
    attachNewNodesRecursively(rootNode, results, rootSeq, maxDivergence);
  }
}// namespace Nextclade
