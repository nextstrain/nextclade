#pragma once

#include <nextalign/nextalign.h>

#include <gsl/string_span>
#include <string>
#include <vector>

#include "nextalign/private/nextalign_private.h"

template<typename Letter>
using SequenceSpan = gsl::basic_string_span<Letter, gsl::dynamic_extent>;

using NucleotideSequenceSpan = SequenceSpan<Nucleotide>;

using AminoacidSequenceSpan = SequenceSpan<Aminoacid>;


struct PeptideInternal {
  std::string name;
  AminoacidSequence seq;
  std::vector<InsertionInternal<Aminoacid>> insertions;
};


struct NextalignResultInternal {
  NucleotideSequence query;
  NucleotideSequence ref;
  int alignmentScore;
  std::vector<PeptideInternal> refPeptides;
  std::vector<PeptideInternal> queryPeptides;
  std::vector<InsertionInternal<Nucleotide>> insertions;
  std::vector<std::string> warnings;
};


Nucleotide toNucleotide(char nuc);

char nucToChar(Nucleotide nuc);

std::string nucToString(Nucleotide nuc);


Aminoacid charToAa(char aa);

char aaToChar(Aminoacid aa);

std::string aaToString(Aminoacid aa);


std::vector<Insertion> toInsertionsExternal(const std::vector<InsertionInternal<Nucleotide>>& insertions);

std::vector<Peptide> toPeptidesExternal(const std::vector<PeptideInternal>& peptides);

NextalignResultInternal nextalignInternal(const NucleotideSequence& query, const NucleotideSequence& ref,
  const GeneMap& geneMap, const NextalignOptions& options);


inline std::ostream& operator<<(std::ostream& os, const Nucleotide& nuc) {
  os << "'" << nucToString(nuc) << "'";
  return os;
}

inline std::ostream& operator<<(std::ostream& os, const NucleotideSequence& seq) {
  os << "\"";
  for (const auto& nuc : seq) {
    os << nucToString(nuc);
  }
  os << "\"";
  return os;
}

inline std::ostream& operator<<(std::ostream& os, const Aminoacid& aa) {
  os << "'" << aaToString(aa) << "'";
  return os;
}

inline std::ostream& operator<<(std::ostream& os, const AminoacidSequence& seq) {
  os << "\"";
  for (const auto& aa : seq) {
    os << aaToString(aa);
  }
  os << "\"";
  return os;
}
