#pragma once


#include <common/safe_vector.h>
#include <nextclade/nextclade.h>

namespace Nextclade {
  safe_vector<NucleotideRange> findSubstitutionRanges(const safe_vector<NucleotideSubstitutionSimple>& substitutions);
}// namespace Nextclade
