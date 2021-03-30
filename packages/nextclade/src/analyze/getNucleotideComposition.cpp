#include "getNucleotideComposition.h"

#include <nextclade/nextclade.h>

#include <map>

#include "../utils/mapFind.h"
#include "../utils/safe_cast.h"

namespace Nextclade {
  std::map<Nucleotide, int> getNucleotideComposition(const NucleotideSequence& alignedQuery) {
    std::map<Nucleotide, int> result;
    const auto& length = safe_cast<int>(alignedQuery.size());
    for (int i = 0; i < length; ++i) {
      const auto& nuc = alignedQuery[i];
      result[nuc] = ++(result[nuc]);
    }
    return result;
  }
}// namespace Nextclade
