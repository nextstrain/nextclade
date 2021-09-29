#pragma once

#include <nextalign/nextalign.h>

#include <string_view>
#include <vector>

#include "../utils/at.h"
#include "../utils/contract.h"
#include "../utils/safe_cast.h"
#include "mapCoordinates.h"

/** Handles conversion of positions between different coordinate systems */
class CoordinateMapper {
protected:
  const std::vector<int> alnToRefMap;// maps alignment positions to reference positions
  const std::vector<int> refToAlnMap;// maps reference positions to alignment positions

public:
  explicit CoordinateMapper(const NucleotideSequence& refAln);

  [[nodiscard]] int alnToRef(int alnPos) const;

  [[nodiscard]] Range alnToRef(const Range& alnRange) const;

  [[nodiscard]] int refToAln(int refPos) const;

  [[nodiscard]] Range refToAln(const Range& refRange) const;
};
