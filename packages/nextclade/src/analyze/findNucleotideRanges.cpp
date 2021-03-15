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
    Nucleotide* foundNuc = nullptr;
    int begin = 0;
    while (i < length) {
      Nucleotide nuc = str[i];

      // find beginning of matching range
      if (pred(nuc)) {
        begin = i;
        foundNuc = &nuc;
      }

      if (foundNuc != nullptr) {
        // rewind forward to the end of matching range
        while (nuc == *foundNuc) {
          ++i;
          nuc = str[i];
        }

        const auto& end = i;
        result.push_back({.begin = begin, .end = end, .length = end - begin, .nuc = *foundNuc});
        foundNuc = nullptr;
      } else {
        ++i;
      }
    }

    return result;
  }

  std::vector<NucleotideRange> findNucleotideRanges(const NucleotideSequence& str, Nucleotide nuc) {
    return findNucleotideRanges(str, [&nuc](const Nucleotide& candidate) { return candidate == nuc; });
  }
}// namespace Nextclade
