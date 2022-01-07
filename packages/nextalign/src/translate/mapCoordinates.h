#pragma once

#include <nextalign/nextalign.h>

#include <string_view>
#include <common/safe_vector.h>

#include "../utils/at.h"
#include <common/contract.h>
#include "../utils/safe_cast.h"
#include "mapCoordinates.h"

/** Handles conversion of positions between different coordinate systems */
class CoordinateMapper {
protected:
  const safe_vector<int> alnToRefMap;// maps alignment positions to reference positions
  const safe_vector<int> refToAlnMap;// maps reference positions to alignment positions

public:
  explicit CoordinateMapper(const NucleotideSequence& refAln);

  [[nodiscard]] int alnToRef(int alnPos) const;

  [[nodiscard]] Range alnToRef(const Range& alnRange) const;

  [[nodiscard]] int refToAln(int refPos) const;

  [[nodiscard]] Range refToAln(const Range& refRange) const;
};
