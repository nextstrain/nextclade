#include "mapCoordinates.h"

#include <nextalign/nextalign.h>

#include <string_view>
#include <vector>

#include "utils/contract.h"
#include "utils/safe_cast.h"

/**
 * Makes a map from reference coordinates to alignment coordinates
 * (Excluding the gaps in reference).
 *
 * Example:
 *   ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
 *   ref    : A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
 *   aln pos: 0  1  2  3           7  8  9  10          14
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


/**
 * Makes a map from alignment coordinates to reference coordinates
 * (Excluding the gaps in reference).
 *
 * Example:
 *   aln pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
 *   ref    : A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
 *   ref pos: 0  1  2  3  3  3  3  4  5  6  7  7  7  7  8
 */
std::vector<int> mapReverseCoordinates(const NucleotideSequence& ref) {
  const auto refLength = safe_cast<int>(ref.size());

  std::vector<int> coordMap;
  coordMap.reserve(refLength);
  int refPos = -1;
  for (int i = 0; i < refLength; ++i) {
    if (ref[i] != Nucleotide::GAP) {
      refPos++;
    }
    coordMap.push_back(refPos);
  }

  coordMap.shrink_to_fit();
  return coordMap;
}
