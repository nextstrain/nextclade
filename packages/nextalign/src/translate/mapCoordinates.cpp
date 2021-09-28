#include "mapCoordinates.h"

#include <nextalign/nextalign.h>

#include <string_view>
#include <vector>

#include "utils/contract.h"
#include "utils/safe_cast.h"


namespace {

  /*****************************************************************************
   *
   *                 OLD IMPLEMENTATIONS
   *
   ****************************************************************************/


  /**
 * Makes the "alingnment to reference" coordinate map: from alignment coordinates to reference coordinates.
 *
 * Given a position of a letter in the aligned sequence, the "alingnment to reference" coordinate map allows to
 * lookup the position of the corresponding letter in the reference sequence.
 *
 * @param refAln  Aligned reference sequence
 * @return        Coordinate map from alignment coordinates to reference coordinates
 */
  std::vector<int> makeAlnToRefMapOld(const NucleotideSequence& ref) {
    const auto alnLength = safe_cast<int>(ref.size());

    std::vector<int> revCoordMap;
    revCoordMap.reserve(alnLength);
    int refPos = 0;
    for (int i = 0; i < alnLength; ++i) {
      if (ref[i] == Nucleotide::GAP) {
        const auto& prev = revCoordMap.back();
        revCoordMap.push_back(prev);
      } else {
        revCoordMap.push_back(refPos);
        ++refPos;
      }
    }

    revCoordMap.shrink_to_fit();
    return revCoordMap;
  }


  /**
 * Makes the "reference to alingnment" coordinate map: from alignment coordinates to reference coordinates.
 *
 * Given a position of a letter in the reference sequence, the "reference to alingnment" coordinate map allows to
 * lookup the position of the corresponding letter in the aligned sequence.
 *
 * @param refAln  Aligned reference sequence
 * @return        Coordinate map from alignment coordinates to reference coordinates
 */
  std::vector<int> makeRefToAlnMapOld(const NucleotideSequence& ref) {
    const auto alnLength = safe_cast<int>(ref.size());

    std::vector<int> coordMap;
    coordMap.reserve(alnLength);
    for (int i = 0; i < alnLength; ++i) {
      if (ref[i] != Nucleotide::GAP) {
        coordMap.push_back(i);
      }
    }

    coordMap.shrink_to_fit();
    return coordMap;
  }


  /*****************************************************************************
   *
   *                 NEW IMPLEMENTATIONS
   *
   ****************************************************************************/


  /**
 * Makes the "alingnment to reference" coordinate map: from alignment coordinates to reference coordinates.
 *
 * Given a position of a letter in the aligned sequence, the "alingnment to reference" coordinate map allows to
 * lookup the position of the corresponding letter in the reference sequence.
 *
 * @param refAln  Aligned reference sequence
 * @return        Coordinate map from alignment coordinates to reference coordinates
 */
  std::vector<int> makeAlnToRefMap(const NucleotideSequence& refAln) {
    int alnLength = safe_cast<int>(refAln.size());
    std::vector<int> alnToRefMap(alnLength);// TODO: Slow
    int refPos = -1;
    for (int alnPos = 0; alnPos < alnLength; ++alnPos) {
      if (refAln[alnPos] != Nucleotide::GAP) {
        refPos += 1;
      }
      alnToRefMap[alnPos] = refPos;
    }
    return alnToRefMap;
  }

  /**
 * Makes the "reference to alingnment" coordinate map: from alignment coordinates to reference coordinates.
 *
 * Given a position of a letter in the reference sequence, the "reference to alingnment" coordinate map allows to
 * lookup the position of the corresponding letter in the aligned sequence.
 *
 * @param refAln  Aligned reference sequence
 * @return        Coordinate map from alignment coordinates to reference coordinates
 */
  std::vector<int> makeRefToAlnMap(const NucleotideSequence& refAln, const std::vector<int>& alnToRef) {
    int refLength = safe_cast<int>(alnToRef.size());
    std::vector<int> refToAlnMap(refLength);// TODO: Slow
    int refPos = -1;
    for (int alnPos = 0; alnPos < refLength; ++alnPos) {
      if (refAln[alnPos] != Nucleotide::GAP) {
        refPos = alnToRef[alnPos];
        refToAlnMap[refPos] = alnPos;
      }
    }
    // truncate unused values in the tail
    refToAlnMap.resize(refPos + 1);// TODO: slow
    return refToAlnMap;
  }
}// namespace

CoordinateMapper::CoordinateMapper(const NucleotideSequence& refAln)
    // old implementation
    : alnToRefMap(makeAlnToRefMapOld(refAln)),
      refToAlnMap(makeRefToAlnMapOld(refAln)) {}

// new implementation
//  : alnToRefMap(makeAlnToRefMap(refAln)),
//    refToAlnMap(makeRefToAlnMap(refAln, alnToRefMap)) {}


/**
 * Converts position from alignment coordinates to reference coordianates
 *
 * @param alnPos  Position in alignment coordinates
 * @return        Position in reference coordinates
 */
int CoordinateMapper::alnToRef(int alnPos) const {
  return at(alnToRefMap, alnPos);
}

/**
 * Converts position from reference coordinates to alignment coordianates
 *
 * @param refPos  Position in reference coordinates
 * @return        Position in alignment coordinates
 */
int CoordinateMapper::refToAln(int refPos) const {
  return at(refToAlnMap, refPos);
}
