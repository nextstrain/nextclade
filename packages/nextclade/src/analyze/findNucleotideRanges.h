#pragma once

#include <nextalign/nextalign.h>
#include <nextclade/nextclade.h>

#include <functional>
#include <vector>

namespace Nextclade {
  /**
  * Finds all contiguous ranges in a given sequence, fulfilling given boolean predicate, while limits search to a range.
  */
  std::vector<NucleotideRange> findNucleotideRanges(  //
    const NucleotideSequence& str,                    //
    const Range& limit,                               //
    const std::function<bool(const Nucleotide&)>& pred//
  );

  /**
  * Finds all contiguous ranges of a given character, in a sequence, while limits search to a range.
  */
  std::vector<NucleotideRange> findNucleotideRanges(//
    const NucleotideSequence& str,                  //
    const Range& limit,                             //
    Nucleotide nuc                                  //
  );

  /**
  * Finds all contiguous ranges in a given sequence, fulfilling given boolean predicate.
  */
  std::vector<NucleotideRange> findNucleotideRanges(  //
    const NucleotideSequence& str,                    //
    const std::function<bool(const Nucleotide&)>& pred//
  );

  /**
  * Finds all contiguous ranges of a given character, in a sequence.
  */
  std::vector<NucleotideRange> findNucleotideRanges(//
    const NucleotideSequence& str,                  //
    Nucleotide nuc                                  //
  );
}// namespace Nextclade
