#include "getPcrPrimerChanges.h"

#include <nextclade/nextclade.h>

#include <algorithm>

#include "../analyze/isMatch.h"
#include "../utils/range.h"

namespace Nextclade {
  /**
   * Decides whether a given mutation should be reported as mutation causing change in a given PCR primer
   */
  bool shouldReportPrimerMutation(const NucleotideSubstitution& mut, const PcrPrimer& primer) {
    // Don't report mutation if outside the primer range
    if (!primer.range.contains(mut.pos)) {
      return false;
    }

    // Don't report mutation if primer contains matching ambiguous nucleotide at this position
    const auto allowed =
      std::any_of(primer.nonAcgts.cbegin(), primer.nonAcgts.cend(), [&mut](const NucleotideLocation& nonACGT) {
        return mut.pos == nonACGT.pos && isMatch(nonACGT.nuc, mut.queryNuc);
      });

    // Report otherwise
    return !allowed;
  }

  /**
   * Adds changed PCR primers to corresponding nucleotide substitutions, in-place.
   * Each substitution can have multiple PCR primer changes.
   */
  void addPrimerChangesInPlace(                        //
    std::vector<NucleotideSubstitution>& substitutions,//
    const std::vector<PcrPrimer>& primers              //
  ) {
    for (auto& mut : substitutions) {
      for (const auto& primer : primers) {
        if (shouldReportPrimerMutation(mut, primer)) {
          mut.pcrPrimersChanged.push_back(primer);
        }
      }
    }
  }

  /**
   * Builds a list of primer changes due to mutations.
   * Each element contains a primer and a list of corresponding substitutions.
   */
  std::vector<PcrPrimerChange> getPcrPrimerChanges(          //
    const std::vector<NucleotideSubstitution>& substitutions,//
    const std::vector<PcrPrimer>& primers                    //
  ) {
    std::vector<PcrPrimerChange> result;
    for (const auto& primer : primers) {

      std::vector<NucleotideSubstitution> substitutionsSelected;
      for (const auto& mut : substitutions) {
        if (shouldReportPrimerMutation(mut, primer)) {
          substitutionsSelected.push_back(mut);
        }
      }

      if (!substitutionsSelected.empty()) {
        result.emplace_back(PcrPrimerChange{.primer = primer, .substitutions = std::move(substitutionsSelected)});
      }
    }
    return result;
  }
}// namespace Nextclade
