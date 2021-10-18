#pragma once

#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <map>
#include <vector>

namespace Nextclade {
  struct PrivateMutations {
    std::vector<NucleotideSubstitutionSimple> privateSubstitutions;
    std::vector<NucleotideDeletionSimple> privateDeletions;
  };

  PrivateMutations findPrivateNucMutations(     //
    const std::map<int, Nucleotide>& nodeMutMap,//
    const AnalysisResult& query,                //
    const NucleotideSequence& refSeq            //
  );
}// namespace Nextclade
