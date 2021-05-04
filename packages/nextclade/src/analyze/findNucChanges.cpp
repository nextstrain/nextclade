#include "findNucChanges.h"

#include <vector>

#include "nucleotide.h"
#include "utils/safe_cast.h"


namespace Nextclade {
  NucMutationsReport findNucChanges(       //
    const NucleotideSequence& refStripped, //
    const NucleotideSequence& queryStripped//
  ) {
    int nDel = 0;
    int delPos = -1;
    bool beforeAlignment = true;
    std::vector<NucleotideSubstitution> substitutions;
    std::vector<NucleotideDeletion> deletions;
    int alignmentStart = -1;
    int alignmentEnd = -1;
    const auto length = safe_cast<int>(queryStripped.size());
    for (int i = 0; i < length; ++i) {
      const auto& d = queryStripped[i];
      if (!isGap(d)) {
        if (beforeAlignment) {
          alignmentStart = i;
          beforeAlignment = false;
        } else if (nDel) {
          deletions.emplace_back(NucleotideDeletion{
            .start = delPos,
            .length = nDel,
            .aaSubstitutions = {},
            .aaDeletions = {},
          });
          nDel = 0;
        }
        alignmentEnd = i + 1;
      }

      const auto& refNuc = refStripped[i];
      if (!isGap(d) && (d != refNuc) && isAcgt(d)) {
        substitutions.emplace_back(NucleotideSubstitution{
          .refNuc = refNuc,
          .pos = i,
          .queryNuc = d,
          .pcrPrimersChanged = {},
          .aaSubstitutions = {},
        });
      } else if (isGap(d) && !beforeAlignment) {
        if (!nDel) {
          delPos = i;
        }
        nDel++;
      }
    }

    return {
      .substitutions = substitutions,
      .deletions = deletions,
      .alignmentStart = alignmentStart,
      .alignmentEnd = alignmentEnd,
    };
  }
}// namespace Nextclade
