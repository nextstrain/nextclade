#include "linkNucAndAaChangesInPlace.h"

#include <nextclade/nextclade.h>

#include "utils/range.h"

namespace Nextclade {

  /**
   * Adds information about aminoacid changes into nucleotide changes data structures and vice versa.
   * The relation is being decided purely by nucleotide and aminoacid positions. We don't necessarily argue that there
   * is a causal link between each linked change, but just show the spatial locality of these changes.
   *
   * A given aminoacid change (substitution or deletion) is considered to be related to a given nucleotide mutation,
   * if nucleotide mutation position falls into the aminoacid codon nucleotide range.
   *
   * A given aminoacid change (substitution or deletion) is considered to be related to a given nucleotide deletion,
   * if nucleotide deletion range intersects aminoacid codon nucleotide range.
   */
  void linkNucAndAaChangesInPlace(NucleotideChangesReport& nucChanges, AminoacidChangesReport& aaChanges) {
    for (auto& aaSub : aaChanges.aaSubstitutions) {
      for (auto& nucSub : nucChanges.substitutions) {
        if (inRange(nucSub.pos, aaSub.codonNucRange)) {
          nucSub.aaSubstitutions.push_back(aaSub);
          aaSub.nucSubstitutions.push_back(nucSub);
        }
      }

      for (auto& nucDel : nucChanges.deletions) {
        const Range nucDelRange{.begin = nucDel.start, .end = nucDel.start + nucDel.length};
        if (hasIntersection(nucDelRange, aaSub.codonNucRange)) {
          nucDel.aaSubstitutions.push_back(aaSub);
          aaSub.nucDeletions.push_back(nucDel);
        }
      }
    }

    for (auto& aaDel : aaChanges.aaDeletions) {
      for (auto& nucSub : nucChanges.substitutions) {
        if (inRange(nucSub.pos, aaDel.codonNucRange)) {
          nucSub.aaDeletions.push_back(aaDel);
          aaDel.nucSubstitutions.push_back(nucSub);
        }
      }

      for (auto& nucDel : nucChanges.deletions) {
        const Range nucDelRange{.begin = nucDel.start, .end = nucDel.start + nucDel.length};
        if (hasIntersection(nucDelRange, aaDel.codonNucRange)) {
          nucDel.aaDeletions.push_back(aaDel);
          aaDel.nucDeletions.push_back(nucDel);
        }
      }
    }
  }

}// namespace Nextclade
