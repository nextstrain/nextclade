#include "findNucleotideRanges.h"

#include <nextalign/nextalign.h>
#include <nextclade/nextclade.h>

#include <vector>

#include "../utils/contract.h"
#include "../utils/safe_cast.h"


namespace Nextclade {

  std::vector<NucleotideRange> findNucleotideRanges(  //
    const NucleotideSequence& str,                    //
    const Range& limit,                               //
    const std::function<bool(const Nucleotide&)>& pred//
  ) {
    precondition_greater_equal(limit.begin, 0);
    precondition_less_equal(limit.begin, limit.end);
    precondition_less_equal(limit.end, str.size());

    const auto& length = limit.end;
    std::vector<NucleotideRange> result;

    int i = limit.begin;
    std::optional<Nucleotide> foundNuc;
    int begin = 0;
    while (i < length) {
      Nucleotide nuc = str[i];

      // find beginning of matching range
      if (pred(nuc)) {
        begin = i;
        foundNuc = nuc;
      }

      if (foundNuc) {
        // rewind forward to the end of matching range
        // TODO: the `i < length` was added to avoid buffer overrun. Double-check algorithmic correctness.
        while ((nuc == *foundNuc) && (i < length)) {
          ++i;
          nuc = str[i];
        }

        const auto& end = i;
        result.push_back({.begin = begin, .end = end, .length = end - begin, .nuc = *foundNuc});
        foundNuc = {};

        // TODO: the `i < length` was added to avoid buffer overrun. Double-check algorithmic correctness.
      } else if (i < length) {
        ++i;
      }
    }

    return result;
  }

  std::vector<NucleotideRange> findNucleotideRanges(//
    const NucleotideSequence& str,                  //
    const Range& limit,                             //
    Nucleotide nuc                                  //
  ) {
    return findNucleotideRanges(str, limit, [&nuc](const Nucleotide& candidate) { return candidate == nuc; });
  }

  /**
  * Finds all contiguous ranges in a given sequence, fulfilling given boolean predicate.
  */
  std::vector<NucleotideRange> findNucleotideRanges(  //
    const NucleotideSequence& str,                    //
    const std::function<bool(const Nucleotide&)>& pred//
  ) {
    return findNucleotideRanges(str, Range{.begin = 0, .end = safe_cast<int>(str.size())}, pred);
  }

  /**
  * Finds all contiguous ranges of a given character, in a sequence.
  */
  std::vector<NucleotideRange> findNucleotideRanges(//
    const NucleotideSequence& str,                  //
    Nucleotide nuc                                  //
  ) {
    return findNucleotideRanges(str, Range{.begin = 0, .end = safe_cast<int>(str.size())}, nuc);
  }
}// namespace Nextclade
