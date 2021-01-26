#include "matchNuc.h"

#include <array>

#include "../alphabet/nucleotides.h"
#include "../utils/to_underlying.h"

namespace {
  // clang-format off
  static constexpr const std::array<int, to_underlying(Nucleotide::SIZE) * to_underlying(Nucleotide::SIZE)> scoringMatrixNuc = {
  /*           00  01  02  03  04  05  06  07  08  09  10  11  12  13  14  15  16 */
  /*            U   T   A   W   C   Y   M   H   G   K   R   D   S   B   V   N   - */
  /* 00   U */  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,
  /* 01   T */  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,  1,  0,
  /* 02   A */  0,  0,  1,  1,  0,  0,  1,  1,  0,  0,  1,  1,  0,  0,  1,  1,  0,
  /* 03   W */  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,  1,  1,  1,  0,
  /* 04   C */  0,  0,  0,  0,  1,  1,  1,  1,  0,  0,  0,  0,  1,  1,  1,  1,  0,
  /* 05   Y */  0,  1,  0,  1,  1,  1,  1,  1,  0,  1,  0,  1,  1,  1,  1,  1,  0,
  /* 06   M */  0,  0,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  0,
  /* 07   H */  0,  1,  1,  1,  1,  1,  1,  1,  0,  1,  1,  1,  1,  1,  1,  1,  0,
  /* 08   G */  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  0,
  /* 09   K */  0,  1,  0,  1,  0,  1,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,
  /* 10   R */  0,  0,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,
  /* 11   D */  0,  1,  1,  1,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,
  /* 12   S */  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,
  /* 13   B */  0,  1,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,
  /* 14   V */  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,
  /* 15   N */  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
  /* 16   - */  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,
  };
  // clang-format on
}// namespace

int lookupMatchScore(Nucleotide x, Nucleotide y) {
  return scoringMatrixNuc.at(to_underlying(x) * to_underlying(Nucleotide::SIZE) + to_underlying(y));
}
