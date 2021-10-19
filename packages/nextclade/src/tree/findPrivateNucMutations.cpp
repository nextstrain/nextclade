#include "findPrivateNucMutations.h"

#include <nextclade/nextclade.h>

#include <map>
#include <vector>

#include "../analyze/isSequenced.h"
#include "../analyze/nucleotide.h"
#include "../utils/eraseDuplicates.h"
#include "../utils/mapFind.h"

namespace Nextclade {
  /**
   * Finds private nucleotide mutations.
   *
   * Private mutations are the mutations in the query (user-provided) sequence relative to the parent node on the
   * reference tree. At this point sequence have not yet become new node on the tree, but is just described by the
   * results of the analysis.
   *
   * We have an array of sequence mutations relative to reference and a map of node mutations relative to reference.
   * We want to find private mutations. The following cases are possible:
   * |---|--------------------------------------------------------------|---------|---------------|--------------|
   * |   |                          Case                                | Private |      From     |     To       |
   * |---|--------------------------------------------------------------|---------|---------------|--------------|
   * | 1 | mutation in sequence and in node, same query character       |   no    |      N/A      |     N/A      |
   * |---|--------------------------------------------------------------|---------|---------------|--------------|
   * | 2 | mutation in sequence and in node, but not the same character |   yes   | node.queryNuc | seq.queryNuc |
   * |---|--------------------------------------------------------------|---------|---------------|--------------|
   * | 3 | mutation in sequence but not in node                         |   yes   | seq.refNuc    | seq.queryNuc |
   * |---|--------------------------------------------------------------|---------|---------------|--------------|
   * | 4 | mutation in node, but not in sequence                        |   yes   | node.queryNuc | node.refNuc  |
   * |   | (mutation in sequence that reverts the character to ref seq) |         |               |              |
   * |---|--------------------------------------------------------------|---------|---------------|--------------|
   */
  PrivateMutations findPrivateNucMutations(     //
    const std::map<int, Nucleotide>& nodeMutMap,//
    const AnalysisResult& seq,                  //
    const NucleotideSequence& refSeq            //
  ) {

    std::vector<NucleotideSubstitutionSimple> privateSubstitutions;
    privateSubstitutions.reserve(seq.totalSubstitutions + nodeMutMap.size());

    std::vector<NucleotideDeletionSimple> privateDeletions;
    privateDeletions.reserve(seq.totalDeletions + nodeMutMap.size());

    // Remember which positions we cover while iterating sequence mutations,
    // to be able to skip them when we iterate over node mutations
    std::set<int> seqPositionsCovered;

    // Process sequence substitutions
    for (const auto& seqMut : seq.substitutions) {
      const auto& pos = seqMut.pos;
      const auto& nodeQueryNuc = mapFind(nodeMutMap, pos);
      seqPositionsCovered.insert(pos);

      if (!nodeQueryNuc) {
        // Case 3: Mutation in sequence but not in node, i.e. a newly occurred mutation.
        // Action: Add the sequence mutation itself.
        privateSubstitutions.emplace_back(
          NucleotideSubstitutionSimple{.refNuc = seqMut.refNuc, .pos = pos, .queryNuc = seqMut.queryNuc});
      } else if (seqMut.queryNuc != nodeQueryNuc) {
        // Case 2: Mutation in sequence and in node, but the query character is not the same.
        // Action: Add mutation from node query character to sequence query character.
        privateSubstitutions.emplace_back(
          NucleotideSubstitutionSimple{.refNuc = *nodeQueryNuc, .pos = pos, .queryNuc = seqMut.queryNuc});
      }

      // Otherwise case 1: mutation in sequence and in node, same query character, i.e. the mutation is not private:
      // nothing to do.
    }

    // Process sequence deletions
    for (const auto& del : seq.deletions) {
      const auto& start = del.start;
      const auto& end = del.start + del.length;

      for (int pos = start; pos < end; ++pos) {
        const auto& nodeQueryNuc = mapFind(nodeMutMap, pos);
        seqPositionsCovered.insert(pos);

        if (!nodeQueryNuc) {
          // Case 3: Deletion in sequence but not in node, i.e. a newly occurred deletion.
          // Action: Add the sequence deletion itself (take refNuc from reference sequence).
          const auto& refNuc = refSeq[pos];
          privateDeletions.emplace_back(NucleotideDeletionSimple{.refNuc = refNuc, .pos = pos});
        } else if (!isGap(*nodeQueryNuc)) {
          // Case 2: Mutation in node but deletion in sequence (mutation to '-'), i.e. the query character is not the
          // same. Action: Add deletion of node query character.
          privateDeletions.emplace_back(NucleotideDeletionSimple{.refNuc = *nodeQueryNuc, .pos = pos});
        }

        // Otherwise case 1: mutation in sequence and in node, same query character, i.e. the mutation is not private:
        // nothing to do.
      }
    }

    // Process node substitutions and deletions
    for (const auto& [pos, nodeQueryNuc] : nodeMutMap) {
      if (!has(seqPositionsCovered, pos) && isSequenced(pos, seq) && nodeQueryNuc != Nucleotide::GAP) {
        // Case 4: Mutation in node, but not in sequence, i.e. mutation in sequence reverts the character to ref seq.
        // Action: Add mutation from node query character to character in reference sequence.
        const auto& refNuc = refSeq[pos];
        if (isGap(refNuc)) {
          privateDeletions.emplace_back(NucleotideDeletionSimple{.refNuc = nodeQueryNuc, .pos = pos});
        } else {
          privateSubstitutions.emplace_back(
            NucleotideSubstitutionSimple{.refNuc = nodeQueryNuc, .pos = pos, .queryNuc = refNuc});
        }
      }
    }

    eraseDuplicatesInPlace(privateSubstitutions);
    eraseDuplicatesInPlace(privateDeletions);

    privateSubstitutions.shrink_to_fit();
    privateDeletions.shrink_to_fit();

    return PrivateMutations{
      .privateSubstitutions = privateSubstitutions,
      .privateDeletions = privateDeletions,
    };
  }
}// namespace Nextclade
