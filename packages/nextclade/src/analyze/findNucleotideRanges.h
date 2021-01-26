#pragma once

#include <nextalign/nextalign.h>
#include <nextclade/nextclade.h>

#include <vector>

namespace Nextclade {
  /**
  * Finds all contiguous ranges of a given character in a given sequence.
  */
  template<typename Predicate>
  std::vector<NucleotideRange> findNucleotideRanges(const NucleotideSequence& str, Predicate pred);

  /**
  * Finds all contiguous ranges in a given sequence, fulfilling given boolean predicate.
  */
  std::vector<NucleotideRange> findNucleotideRanges(const NucleotideSequence& str, Nucleotide nuc);
}// namespace Nextclade
