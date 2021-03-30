#include "findNucleotideRanges.h"

#include <nextalign/nextalign.h>
#include <nextclade/nextclade.h>

#include <vector>

#include "utils/safe_cast.h"


namespace Nextclade {

  std::vector<NucleotideRange> findNucleotideRanges(
    const NucleotideSequence& str, const std::function<bool(const Nucleotide&)>& pred) {
    const auto& length = safe_cast<int>(str.length());
    std::vector<NucleotideRange> result;

    int i = 0;
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

  std::vector<NucleotideRange> findNucleotideRanges(const NucleotideSequence& str, Nucleotide nuc) {
    return findNucleotideRanges(str, [&nuc](const Nucleotide& candidate) { return candidate == nuc; });
  }
}// namespace Nextclade
