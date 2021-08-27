#pragma once

#include <nextclade/nextclade.h>

#include <map>

namespace Nextclade {
  std::map<Nucleotide, int> getNucleotideComposition(const NucleotideSequence& alignedQuery);
}// namespace Nextclade
