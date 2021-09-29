#pragma once

#include <nextalign/nextalign.h>

#include <string_view>
#include <vector>

#include "../utils/at.h"
#include "../utils/contract.h"
#include "../utils/safe_cast.h"
#include "mapCoordinates.h"


namespace details {

  /*****************************************************************************
   *
   *                 OLD IMPLEMENTATIONS
   *
   ****************************************************************************/


  /**
 * Makes the "alignment to reference" coordinate map: from alignment coordinates to reference coordinates.
 *
 * Given a position of a letter in the aligned sequence, the "alignment to reference" coordinate map allows to
 * lookup the position of the corresponding letter in the reference sequence.
 *
 * @param refAln  Aligned reference sequence
 * @return        Coordinate map from alignment coordinates to reference coordinates
 */
  template<typename Letter>
  std::vector<int> makeAlnToRefMapOld(const Sequence<Letter>& ref) {
    const auto alnLength = safe_cast<int>(ref.size());

    std::vector<int> revCoordMap;
    revCoordMap.reserve(alnLength);
    int refPos = 0;
    for (int i = 0; i < alnLength; ++i) {
      if (ref[i] == Letter::GAP) {
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
 * Makes the "reference to alignment" coordinate map: from alignment coordinates to reference coordinates.
 *
 * Given a position of a letter in the reference sequence, the "reference to alignment" coordinate map allows to
 * lookup the position of the corresponding letter in the aligned sequence.
 *
 * @param refAln  Aligned reference sequence
 * @return        Coordinate map from alignment coordinates to reference coordinates
 */
  template<typename Letter>
  std::vector<int> makeRefToAlnMapOld(const Sequence<Letter>& ref) {
    const auto alnLength = safe_cast<int>(ref.size());

    std::vector<int> coordMap;
    coordMap.reserve(alnLength);
    for (int i = 0; i < alnLength; ++i) {
      if (ref[i] != Letter::GAP) {
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
 * Makes the "alignment to reference" coordinate map: from alignment coordinates to reference coordinates.
 *
 * Given a position of a letter in the aligned sequence, the "alignment to reference" coordinate map allows to
 * lookup the position of the corresponding letter in the reference sequence.
 *
 * @param refAln  Aligned reference sequence
 * @return        Coordinate map from alignment coordinates to reference coordinates
 */
  template<typename Letter>
  std::vector<int> makeAlnToRefMap(const Sequence<Letter>& refAln) {
    int alnLength = safe_cast<int>(refAln.size());
    std::vector<int> alnToRefMap(alnLength);// TODO: Slow
    int refPos = -1;
    for (int alnPos = 0; alnPos < alnLength; ++alnPos) {
      if (refAln[alnPos] != Letter::GAP) {
        refPos += 1;
      }
      alnToRefMap[alnPos] = refPos;
    }
    return alnToRefMap;
  }

  /**
 * Makes the "reference to alignment" coordinate map: from alignment coordinates to reference coordinates.
 *
 * Given a position of a letter in the reference sequence, the "reference to alignment" coordinate map allows to
 * lookup the position of the corresponding letter in the aligned sequence.
 *
 * @param refAln  Aligned reference sequence
 * @return        Coordinate map from alignment coordinates to reference coordinates
 */
  template<typename Letter>
  std::vector<int> makeRefToAlnMap(const Sequence<Letter>& refAln, const std::vector<int>& alnToRef) {
    int refLength = safe_cast<int>(alnToRef.size());
    std::vector<int> refToAlnMap(refLength);// TODO: Slow
    int refPos = -1;
    for (int alnPos = 0; alnPos < refLength; ++alnPos) {
      if (refAln[alnPos] != Letter::GAP) {
        refPos = alnToRef[alnPos];
        refToAlnMap[refPos] = alnPos;
      }
    }
    // truncate unused values in the tail
    refToAlnMap.resize(refPos + 1);// TODO: slow
    return refToAlnMap;
  }
}// namespace details


/** Handles conversion of positions between different coordinate systems */
template<typename Letter>
class CoordinateMapper {
protected:
  const std::vector<int> alnToRefMap;// maps alignment positions to reference positions
  const std::vector<int> refToAlnMap;// maps reference positions to alignment positions

public:
  explicit CoordinateMapper(const Sequence<Letter>& refAln)
      : alnToRefMap(details::makeAlnToRefMapOld(refAln)),
        refToAlnMap(details::makeRefToAlnMapOld(refAln)) {}

  /**
   * Converts position from alignment coordinates to reference coordinates
   *
   * @param alnPos  Position in alignment coordinates
   * @return        Position in reference coordinates
   */
  [[nodiscard]] int alnToRef(int alnPos) const {
    return at(alnToRefMap, alnPos);
  }

  /**
   * Converts position from reference coordinates to alignment coordinates
   *
   * @param refPos  Position in reference coordinates
   * @return        Position in alignment coordinates
   */
  [[nodiscard]] int refToAln(int refPos) const {
    return at(refToAlnMap, refPos);
  }

  /**
   * Converts range from reference coordinates to alignment coordinates
   *
   * @param refPos  Range in reference coordinates
   * @return        Range in alignment coordinates
   */
  [[nodiscard]] Range alnToRef(const Range& alnRange) const {
    return Range{
      .begin = alnToRef(alnRange.begin),
      .end = alnToRef(alnRange.end),
    };
  }

  /**
   * Converts range from reference coordinates to alignment coordinates
   *
   * @param refPos  Range in reference coordinates
   * @return        Range in alignment coordinates
   */
  [[nodiscard]] Range refToAln(const Range& refRange) const {
    return Range{
      .begin = refToAln(refRange.begin),
      .end = refToAln(refRange.end),
    };
  }
};
