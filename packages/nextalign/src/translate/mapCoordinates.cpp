#include "mapCoordinates.h"

#include <nextalign/nextalign.h>

#include <string_view>
#include <vector>

#include "utils/contract.h"
#include "utils/safe_cast.h"

/**
 * Makes a map from raw coordinates to alignment coordinates
 * (Excluding the gaps in reference).
 *
 * Example:
 *   012345678901234
 *   ACTC---CGTG---A -> aln_coord = [0,1,2,3,7,8,9,10,14]
 */
std::vector<int> mapCoordinates(const NucleotideSequence& ref) {
  const auto refLength = safe_cast<int>(ref.size());

  std::vector<int> coordMap;
  coordMap.reserve(refLength);
  for (int i = 0; i < refLength; ++i) {
    if (ref[i] != Nucleotide::GAP) {
      coordMap.push_back(i);
    }
  }

  coordMap.shrink_to_fit();
  return coordMap;
}
