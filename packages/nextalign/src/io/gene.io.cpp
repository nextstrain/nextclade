#include "../io/gene.io.h"

#include <nextalign/nextalign.h>


bool operator==(const Gene& left, const Gene& right) {
  // clang-format off
  return left.geneName == right.geneName &&
         left.start == right.start &&
         left.end == right.end &&
         left.strand == right.strand &&
         left.frame == right.frame;
  // clang-format on
}

std::ostream& operator<<(std::ostream& os, const Gene& gene) {
  os << "{ ";
  os << "geneName: " << gene.geneName << ", ";
  os << "start: " << gene.start << ", ";
  os << "end: " << gene.end << ", ";
  os << "strand: " << gene.strand << ", ";
  os << "frame: " << gene.frame << ", ";
  os << "}";
  return os;
}
