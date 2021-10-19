#include "findPrivateNucMutations.h"

#include <nextclade/nextclade.h>

#include <map>
#include <vector>

#include "analyze/isSequenced.h"
#include "analyze/nucleotide.h"
#include "utils/mapFind.h"

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
   * | 1 | mutation in sequence and in node, same query character       |   no    |               |              |
   * |---|--------------------------------------------------------------|---------|---------------|--------------|
   * | 2 | mutation in sequence and in node, but not the same character |   yes   | node.queryNuc | seq.queryNuc |
   * |---|--------------------------------------------------------------|---------|---------------|--------------|
   * | 3 | mutation in sequence but not in node                         |   yes   | seq.refNuc    | seq.queryNuc |
   * |---|--------------------------------------------------------------|---------|---------------|--------------|
   * | 4 | mutation in node, but not in sequence                        |   yes   | node.queryNuc | node.refNuc  |
   * |   | (mutation in sequence that reverts the character to ref)     |         |               |              |
   * |---|--------------------------------------------------------------|---------|---------------|--------------|
   */
  PrivateMutations findPrivateNucMutations(     //
    const std::map<int, Nucleotide>& nodeMutMap,//
    const AnalysisResult& seq,                  //
    const NucleotideSequence& refSeq            //
  ) {

    std::vector<NucleotideSubstitutionSimple> privateSubstitutions;
    privateSubstitutions.reserve(seq.substitutions.size());

    std::vector<NucleotideDeletionSimple> privateDeletions;
    privateDeletions.reserve(seq.deletions.size());

    std::set<int> seqPositionsCovered;

    for (const auto& qmut : seq.substitutions) {
      const auto& pos = qmut.pos;
      const auto& queryNuc = qmut.queryNuc;
      seqPositionsCovered.insert(pos);
      const auto der = mapFind(nodeMutMap, pos);

      std::optional<Nucleotide> refNuc;
      if (der) {
        if (queryNuc != der) {
          // shared site but states of node and seq differ
          refNuc = der;
        }
      } else {
        // node does not have a mutation, but seq does -> compare to root
        refNuc = refSeq[pos];
      }

      if (refNuc) {
        privateSubstitutions.push_back(NucleotideSubstitutionSimple{
          .refNuc = *refNuc,
          .pos = pos,
          .queryNuc = queryNuc,
        });
      }
    }

    for (const auto& del : seq.deletions) {
      const auto& start = del.start;
      const auto& end = del.start + del.length;

      for (int pos = start; pos < end; ++pos) {
        const auto& nodeQueryNuc = mapFind(nodeMutMap, pos);
        seqPositionsCovered.insert(pos);

        std::optional<Nucleotide> refNuc;
        if (nodeQueryNuc) {
          if (isGap(*nodeQueryNuc)) {
            // shared site but states of node and seq differ
            refNuc = nodeQueryNuc;
          }
        } else {
          // node does not have a mutation, but seq does -> compare to root
          refNuc = refSeq[pos];
        }

        if (refNuc) {
          privateDeletions.push_back(NucleotideDeletionSimple{
            .refNuc = *refNuc,
            .pos = pos,
          });
        }
      }
    }

    for (const auto& [nodePos, nodeQueryNuc] : nodeMutMap) {
      // mutation in node that is not present in sequence
      if (!has(seqPositionsCovered, nodePos) && isSequenced(nodePos, seq) && nodeQueryNuc != Nucleotide::GAP) {
        const auto& refNuc = refSeq[nodePos];
        privateSubstitutions.push_back(NucleotideSubstitutionSimple{
          .refNuc = nodeQueryNuc,
          .pos = nodePos,
          .queryNuc = refNuc,
        });
      }
    }

    privateSubstitutions.shrink_to_fit();
    privateDeletions.shrink_to_fit();

    return PrivateMutations{
      .privateSubstitutions = privateSubstitutions,
      .privateDeletions = privateDeletions,
    };
  }
}// namespace Nextclade
