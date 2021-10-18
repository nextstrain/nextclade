#include "findPrivateNucMutations.h"

#include <nextclade/nextclade.h>

#include <map>
#include <vector>

#include "analyze/isSequenced.h"
#include "analyze/nucleotide.h"
#include "utils/mapFind.h"

namespace Nextclade {
  PrivateMutations findPrivateNucMutations(     //
    const std::map<int, Nucleotide>& nodeMutMap,//
    const AnalysisResult& result,               //
    const NucleotideSequence& refSeq            //
  ) {
    std::vector<NucleotideSubstitutionSimple> privateSubstitutions;
    privateSubstitutions.reserve(result.totalSubstitutions);

    std::vector<NucleotideDeletionSimple> privateDeletions;
    privateDeletions.reserve(result.totalDeletions);

    std::set<int> positionsCovered;

    for (const auto& qmut : result.substitutions) {
      const auto& pos = qmut.pos;
      const auto& queryNuc = qmut.queryNuc;
      positionsCovered.insert(pos);
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

    for (const auto& del : result.deletions) {
      const auto& start = del.start;
      const auto& end = del.start + del.length;

      for (int pos = start; pos < end; ++pos) {
        const auto& der = mapFind(nodeMutMap, pos);
        positionsCovered.insert(pos);

        std::optional<Nucleotide> refNuc;
        if (der) {
          if (isGap(*der)) {
            // shared site but states of node and seq differ
            refNuc = der;
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

    for (const auto& [pos, nuc] : nodeMutMap) {
      // mutation in node that is not present in sequence
      if (!has(positionsCovered, pos) && isSequenced(pos, result) && nuc != Nucleotide::GAP) {
        const auto& refNuc = refSeq[pos];
        privateSubstitutions.push_back(NucleotideSubstitutionSimple{
          .refNuc = nuc,
          .pos = pos,
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
