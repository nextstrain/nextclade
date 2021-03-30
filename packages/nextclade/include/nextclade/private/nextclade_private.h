#pragma once


#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <ostream>
#include <string>
#include <vector>

#include "../../../../nextalign/src/alphabet/aminoacids.h" // FIXME: Should not include the internals of another package
#include "../../../../nextalign/src/alphabet/nucleotides.h"// FIXME: Should not include the internals of another package


namespace Nextclade {
  inline bool operator==(const NucleotideSubstitution& lhs, const NucleotideSubstitution& rhs) {
    return lhs.pos == rhs.pos && lhs.refNuc == rhs.refNuc && lhs.queryNuc == rhs.queryNuc;
  }

  inline bool operator<(const NucleotideSubstitution& lhs, const NucleotideSubstitution& rhs) {
    return lhs.pos < rhs.pos || lhs.refNuc < rhs.refNuc || lhs.queryNuc < rhs.queryNuc;
  }

  inline bool operator==(const NucleotideInsertion& lhs, const NucleotideInsertion& rhs) {
    return lhs.pos == rhs.pos && lhs.ins == rhs.ins && lhs.length == rhs.length;
  }

  inline bool operator==(const NucleotideDeletion& lhs, const NucleotideDeletion& rhs) {
    return lhs.start == rhs.start && lhs.length == rhs.length;
  }

  inline bool operator==(const NucleotideRange& lhs, const NucleotideRange& rhs) {
    return lhs.begin == rhs.begin && lhs.end == rhs.end && lhs.length == rhs.length && lhs.nuc == rhs.nuc;
  }

  inline std::ostream& operator<<(std::ostream& os, const NucleotideSubstitution& val) {
    os << "{ ";
    os << "refNuc: " << nucToString(val.refNuc) << ", ";
    os << "pos: " << val.pos << ", ";
    os << "queryNuc: " << nucToString(val.queryNuc);
    os << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const NucleotideInsertion& val) {
    os << "{ ";
    os << "pos: " << val.pos << ", ";
    os << "length: " << val.length << ", ";
    os << "ins: '";
    for (const auto& v : val.ins) {
      os << nucToString(v);
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

  inline std::ostream& operator<<(std::ostream& os, const NucleotideRange& val) {
    os << "{ ";
    os << "nuc: " << nucToString(val.nuc) << ", ";
    os << "begin: " << val.begin << ", ";
    os << "end: " << val.end << ", ";
    os << "length: " << val.length;
    os << " }";
    return os;
  }
}// namespace Nextclade
