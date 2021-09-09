#include "filterAminoacidChanges.h"

#include <nextclade/nextclade.h>

#include "utils/range.h"


namespace Nextclade {
  AminoacidChangesReport filterAminoacidChanges(const AminoacidChangesReport& aaChanges,
    const std::vector<FrameShiftResult>& frameShits) {
    AminoacidChangesReport result;

    for (const auto& frameShift : frameShits) {
      for (const auto& sub : result.aaSubstitutions) {
        if (sub.queryAA == Aminoacid::STOP || !inRange(sub.codon, frameShift.codon)) {
          result.aaSubstitutions.push_back(sub);
        }
      }

      for (const auto& del : result.aaDeletions) {
        if (!inRange(del.codon, frameShift.codon)) {
          result.aaDeletions.push_back(del);
        }
      }
    }

    return result;
  }
}// namespace Nextclade
