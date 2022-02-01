#pragma once

#include <common/safe_vector.h>
#include <nextclade/nextclade.h>

namespace Nextclade {
  safe_vector<NucleotideRange> findDeletionRanges(const safe_vector<NucleotideDeletionSimple>& privateDeletions);
}// namespace Nextclade
