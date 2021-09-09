#include "filterAminoacidChanges.h"

#include <nextclade/nextclade.h>

#include "utils/range.h"
#include "utils/removeInPlace.h"


namespace Nextclade {
  void filterAminoacidChangesInPlace(AminoacidChangesReport& aaChanges,
    const std::vector<FrameShiftResult>& frameShits) {

    removeInPlaceIf(aaChanges.aaSubstitutions, [&frameShits](const AminoacidSubstitution& sub) {
      for (const auto& frameShift : frameShits) {
        if (inRange(sub.codon, frameShift.codon) && sub.queryAA != Aminoacid::STOP) {
          return true;
        }
      }
      return false;
    });

    removeInPlaceIf(aaChanges.aaDeletions, [&frameShits](const AminoacidDeletion& del) {
      for (const auto& frameShift : frameShits) {
        if (inRange(del.codon, frameShift.codon)) {
          return true;
        }
      }
      return false;
    });
  }
}// namespace Nextclade
