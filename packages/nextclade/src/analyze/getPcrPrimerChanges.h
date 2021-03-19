#pragma once

#include <vector>

namespace Nextclade {
  struct NucleotideSubstitution;
  struct PcrPrimer;
  struct PcrPrimerChange;

  bool shouldReportPrimerMutation(const NucleotideSubstitution& mut, const PcrPrimer& primer);

  void addPrimerChangesInPlace(                        //
    std::vector<NucleotideSubstitution>& substitutions,//
    const std::vector<PcrPrimer>& primers              //
  );

  std::vector<PcrPrimerChange> getPcrPrimerChanges(          //
    const std::vector<NucleotideSubstitution>& substitutions,//
    const std::vector<PcrPrimer>& primers                    //
  );
}// namespace Nextclade
