#pragma once

#include <nextclade/nextclade.h>

namespace Nextclade {
  void linkNucAndAaChangesInPlace(NucleotideChangesReport& nucChanges, AminoacidChangesReport& aaChanges);
}// namespace Nextclade
