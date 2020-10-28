#pragma once

#include <ostream>
#include <string>
#include <vector>

struct NucleotideSubstitution {
  int pos;
  char refNuc;
  char queryNuc;
};

inline bool operator==(const NucleotideSubstitution& lhs, const NucleotideSubstitution& rhs) {
  return lhs.pos == rhs.pos && lhs.refNuc == rhs.refNuc && lhs.queryNuc == rhs.queryNuc;
}

inline std::ostream& operator<<(std::ostream& os, const NucleotideSubstitution& val) {
  os << "{ ";
  os << "pos: " << val.pos << ", ";
  os << "queryNuc: " << val.queryNuc << ", ";
  os << "refNuc: " << val.refNuc;
  os << " }";
  return os;
}


struct NucleotideInsertion {
  int pos;
  std::string ins;
};

inline bool operator==(const NucleotideInsertion& lhs, const NucleotideInsertion& rhs) {
  return lhs.pos == rhs.pos && lhs.ins == rhs.ins;
}

inline std::ostream& operator<<(std::ostream& os, const NucleotideInsertion& val) {
  os << "{ ";
  os << "pos: " << val.pos << ", ";
  os << "ins: '";
  for (const auto& v : val.ins) {
    os << v;
  }
  os << "' }";
  return os;
}


struct NucleotideDeletion {
  int start;
  int length;
};

inline bool operator==(const NucleotideDeletion& lhs, const NucleotideDeletion& rhs) {
  return lhs.start == rhs.start && lhs.length == rhs.length;
}

inline std::ostream& operator<<(std::ostream& os, const NucleotideDeletion& val) {
  os << "{ ";
  os << "start: " << val.start << ", ";
  os << "length: " << val.length;
  os << " }";
  return os;
}


struct AnalyzeSeqResult {
  std::vector<NucleotideInsertion> insertions;
  std::vector<NucleotideSubstitution> substitutions;
  std::vector<NucleotideDeletion> deletions;
  int alignmentStart;
  int alignmentEnd;
};

AnalyzeSeqResult analyzeSequence(const std::string& query, const std::string& ref);
