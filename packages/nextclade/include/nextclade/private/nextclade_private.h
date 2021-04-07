#pragma once


#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <ostream>
#include <string>
#include <vector>


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

  inline bool operator==(const Range& lhs, const Range& rhs) {
    return lhs.begin == rhs.begin && lhs.end == rhs.end;
  }


  inline bool operator==(const NucleotideRange& lhs, const NucleotideRange& rhs) {
    return lhs.begin == rhs.begin && lhs.end == rhs.end && lhs.length == rhs.length && lhs.nuc == rhs.nuc;
  }

  inline bool operator==(const AminoacidSubstitution& lhs, const AminoacidSubstitution& rhs) {
    return (                          //
      lhs.refAA == rhs.refAA &&       //
      lhs.queryAA == rhs.queryAA &&   //
      lhs.codon == rhs.codon &&       //
      lhs.gene == rhs.gene &&         //
      lhs.nucRange == rhs.nucRange && //
      lhs.refCodon == rhs.refCodon && //
      lhs.queryCodon == rhs.queryCodon//
    );
  }

  inline bool operator==(const AminoacidDeletion& lhs, const AminoacidDeletion& rhs) {
    return (                         //
      lhs.refAA == rhs.refAA &&      //
      lhs.codon == rhs.codon &&      //
      lhs.gene == rhs.gene &&        //
      lhs.nucRange == rhs.nucRange &&//
      lhs.refCodon == rhs.refCodon   //
    );
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

  inline std::ostream& operator<<(std::ostream& os, const Range& val) {
    os << "{ ";
    os << "begin: " << val.begin << ", ";
    os << "end: " << val.end;
    os << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const AminoacidSubstitution& val) {
    os << "{ ";
    os << "refAA: " << val.refAA << ", ";
    os << "queryAA: " << val.queryAA << ", ";
    os << "codon: " << val.codon << ", ";
    os << "gene: \"" << val.gene << "\", ";
    os << "nucRange: " << val.nucRange << ", ";
    os << "refCodon: " << val.refCodon << ", ";
    os << "queryCodon: " << val.queryCodon;
    os << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const AminoacidDeletion& val) {
    os << "{ ";
    os << "refAA: " << val.refAA << ", ";
    os << "codon: " << val.codon << ", ";
    os << "gene: \"" << val.gene << "\", ";
    os << "nucRange: " << val.nucRange << ", ";
    os << "refCodon: " << val.refCodon;
    os << " }";
    return os;
  }
}// namespace Nextclade
