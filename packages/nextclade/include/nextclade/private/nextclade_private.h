#pragma once

#include <nextclade/nextclade.h>

#include <ostream>
#include <string>
#include <vector>

#include "../../../../nextalign/src/alphabet/nucleotides.h"


namespace Nextclade {
  inline bool operator==(const NucleotideSubstitution& lhs, const NucleotideSubstitution& rhs) {
    return lhs.pos == rhs.pos && lhs.refNuc == rhs.refNuc && lhs.queryNuc == rhs.queryNuc;
  }

  inline bool operator==(const NucleotideInsertion& lhs, const NucleotideInsertion& rhs) {
    return lhs.pos == rhs.pos && lhs.ins == rhs.ins;
  }

  inline bool operator==(const NucleotideDeletion& lhs, const NucleotideDeletion& rhs) {
    return lhs.start == rhs.start && lhs.length == rhs.length;
  }

  inline std::ostream& operator<<(std::ostream& os, const NucleotideSubstitution& val) {
    os << "{ ";
    os << "pos: " << val.pos << ", ";
    os << "queryNuc: " << nucToChar(val.queryNuc) << ", ";
    os << "refNuc: " << nucToChar(val.refNuc);
    os << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const NucleotideInsertion& val) {
    os << "{ ";
    os << "pos: " << val.pos << ", ";
    os << "ins: '";
    for (const auto& v : val.ins) {
      os << nucToChar(v);
    }
    os << "' }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const NucleotideDeletion& val) {
    os << "{ ";
    os << "start: " << val.start << ", ";
    os << "length: " << val.length;
    os << " }";
    return os;
  }
}// namespace Nextclade
