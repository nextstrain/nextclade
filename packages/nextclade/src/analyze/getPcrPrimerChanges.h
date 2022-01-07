#pragma once

#include <nextclade/nextclade.h>

#include <common/safe_vector.h>

namespace Nextclade {
  struct PcrPrimer;
  struct PcrPrimerChange;

  bool shouldReportPrimerMutation(const NucleotideSubstitution& mut, const PcrPrimer& primer);

  void addPrimerChangesInPlace(                        //
    safe_vector<NucleotideSubstitution>& substitutions,//
    const safe_vector<PcrPrimer>& primers              //
  );

  safe_vector<PcrPrimerChange> getPcrPrimerChanges(          //
    const safe_vector<NucleotideSubstitution>& substitutions,//
    const safe_vector<PcrPrimer>& primers                    //
  );
}// namespace Nextclade
