#include "treeAttachNodes.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <limits>
#include <vector>

#include "../analyze/isSequenced.h"
#include "../io/formatMutation.h"
#include "../utils/contract.h"
#include "../utils/eraseDuplicates.h"
#include "../utils/mapFind.h"
#include "Tree.h"
#include "TreeNode.h"

namespace Nextclade {
  namespace {
    constexpr auto NEGATIVE_INFINITY = -std::numeric_limits<double>::infinity();

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

    auto aux = node.addChildFromCopy(node);
    aux.setNucleotideMutationsEmpty();

    node.setName(fmt::format("{}_parent", aux.name()));

    // FIXME: there could be more attributes. Instead, should probably delete all attributes, except some.
    node.removeNodeAttr("author");
    node.removeNodeAttr("url");
  }

  // TODO: implement this
  std::map<std::string, std::vector<std::string>> groupAminoacidMutations(
    const std::vector<AminoacidMutationEntry>& aminoacidMutationEntries) {
    //  const aminoacidMutationsGrouped = groupBy(aminoacidMutationEntries, ({ gene }) => gene)
    //  const aminoacidMutationsFinal = mapValues(aminoacidMutationsGrouped, (aaMuts) => aaMuts.map(({ aaMut }) => aaMut))
    //  const mutations = {
    //    nuc: nucMutations,
    //    ...aminoacidMutationsFinal,
    //  }
    return {};
  }

  GetDifferencesResult getDifferences(
    const NextcladeResult& result, TreeNode& node, const NucleotideSequence& rootSeq, double maxDivergence) {
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
        const auto mut = formatMutation(
          NucleotideSubstitution{.refNuc = *refNuc, .pos = pos, .queryNuc = queryNuc, .pcrPrimersChanged = {}});
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
          const auto mut = formatMutation(
            NucleotideSubstitution{.refNuc = *refNuc, .pos = pos, .queryNuc = queryNuc, .pcrPrimersChanged = {}});
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
        const auto& mutStr = formatMutation(
          NucleotideSubstitution{.refNuc = nuc, .pos = pos, .queryNuc = refNuc, .pcrPrimersChanged = {}});
        nucMutations.push_back(mutStr);
        totalNucMutations += 1;
      }
    }


    const auto baseDiv = node.divergence().value_or(0);
    // HACK: Guess the unit of measurement of divergence.
    // Taken from: https://github.com/nextstrain/auspice/blob/6a2d0f276fccf05bfc7084608bb0010a79086c83/src/components/tree/phyloTree/renderers.js#L376
    // FIXME: Should be resolved upstream in augur/auspice.
    auto thisDiv = totalNucMutations;// unit: number of substitutions
    if (maxDivergence <= 5) {
      thisDiv /= rootSeq.size();// unit: number of substitutions per site
    }

    const auto divergence = baseDiv + thisDiv;

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

    auto nowNode = node.addChild();

    // TODO: implement this

    //  const qcStatus = qc?.overallStatus
    //  let qcFlags = 'Not available'
    //  if (qc) {
    //    const { privateMutations, snpClusters, mixedSites, missingData } = qc
    //    const messages = [
    //      formatQCMissingData(t, missingData),
    //      formatQCPrivateMutations(t, privateMutations),
    //      formatQCMixedSites(t, mixedSites),
    //      formatQCSNPClusters(t, snpClusters),
    //    ].filter(notUndefined)
    //    qcFlags = messages.join('; ')
    //  }

    //  const alignment = `start: ${alignmentStart}, end: ${alignmentEnd} (score: ${alignmentScore})`
    //
    //  const listOfMissing = missing.map(({ begin, end }) => formatRange(begin, end)).join(', ')
    //  const formattedMissing = totalMissing > 0 ? `(${totalMissing}): ${listOfMissing}` : 'None'
    //
    //  const listOfNonACGTNs = nonACGTNs.map(({ begin, end, nuc }) => `${nuc}: ${formatRange(begin, end)}`).join(', ')
    //  const formattedNonACGTNs = totalNonACGTNs > 0 ? `(${totalNonACGTNs}): ${listOfNonACGTNs}` : 'None'
    //
    //  const listOfGaps = deletions.map(({ start, length }) => formatRange(start, start + length)).join(', ')
    //  const formattedGaps = totalGaps > 0 ? `(${totalGaps}): ${listOfGaps}` : 'None'
    //
    //  const listOfPcrPrimerChanges = pcrPrimerChanges.map(formatPrimer).join(', ')
    //  const formattedPcrPrimerChanges =
    //    totalPcrPrimerChanges > 0 ? `(${totalPcrPrimerChanges}): ${listOfPcrPrimerChanges}` : 'None'

    //  return {
    //    id: -1,
    //    children: undefined,
    //    mutations: undefined,
    //    branch_attrs: { mutations: {} },
    //    name: `${seq.seqName}_clades`,
    //    node_attrs: {
    //      'clade_membership': { value: seq.clade },
    //      'Node type': { value: NodeType.New },
    //      'Alignment': { value: alignment },
    //      'Missing:': { value: formattedMissing },
    //      'Gaps': { value: formattedGaps },
    //      'Non-ACGTNs': { value: formattedNonACGTNs },
    //      'Has PCR primer changes': { value: totalPcrPrimerChanges > 0 ? 'Yes' : 'No' },
    //      'PCR primer changes': { value: formattedPcrPrimerChanges },
    //      'QC Status': { value: qcStatus },
    //      'QC Flags': { value: qcFlags },
    //    },
    //  }

    //  const new_node = get_node_struct(result)
    //  set(new_node, 'branch_attrs.mutations', mutations)
    //  set(new_node, 'node_attrs.div', div)
    //  set(new_node, 'node_attrs.region', { value: UNKNOWN_VALUE })
    //  set(new_node, 'node_attrs.country', { value: UNKNOWN_VALUE })
    //  set(new_node, 'node_attrs.division', { value: UNKNOWN_VALUE })
    //  set(new_node, 'mutations', copy(nearestRefNode.mutations))
    //
    //  for (const mut of nucMutations) {
    //    const { pos, queryNuc } = parseMutationOrThrow(mut)
    //    new_node.mutations?.set(pos, queryNuc)
    //  }
  }

  /**
   * Attaches a new node to the reference tree
   */
  void attachNewNode(
    const NextcladeResult& result, TreeNode& node, const NucleotideSequence& rootSeq, double maxDivergence) {
    precondition_equal(node.isReferenceNode(), true);   // Attach only to a reference node
    precondition_equal(node.id(), result.nearestNodeId);// Attach only to the matching node

    if (node.isLeaf()) {
      addAuxiliaryNode(node);
    }

    const auto& [mutations, nucMutations, divergence] = getDifferences(result, node, rootSeq, maxDivergence);
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
    auto children = node.children();
    children.forEach([&results, &rootSeq, &maxDivergence](TreeNode& child) {//
      attachNewNodesRecursively(child, results, rootSeq, maxDivergence);    //
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
    auto children = node.children();

    // TODO: can we simplify and use `divergence` variable directly instead of this?
    auto childMaxDivergence = NEGATIVE_INFINITY;
    children.forEach([&childMaxDivergence](const TreeNode& child) {
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
