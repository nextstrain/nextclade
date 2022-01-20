#pragma once

#include <nextalign/nextalign.h>

#include <gsl/string_span>
#include <string>
#include <common/safe_vector.h>


template<typename Letter>
using SequenceSpan = gsl::basic_string_span<Letter, gsl::dynamic_extent>;

using NucleotideSequenceSpan = SequenceSpan<Nucleotide>;

using AminoacidSequenceSpan = SequenceSpan<Aminoacid>;


Nucleotide toNucleotide(char nuc);

Nucleotide stringToNuc(const std::string& nuc);

char nucToChar(Nucleotide nuc);

std::string nucToString(Nucleotide nuc);


Aminoacid charToAa(char aa);

Aminoacid stringToAa(const std::string& aa);

char aaToChar(Aminoacid aa);

std::string aaToString(Aminoacid aa);

template<typename Letter>
struct LetterTag {};

template<typename Letter>
inline Letter stringToLetter(const std::string& str, LetterTag<Letter>);

template<>
inline Nucleotide stringToLetter<Nucleotide>(const std::string& str, LetterTag<Nucleotide>) {
  return stringToNuc(str);
}

template<>
inline Aminoacid stringToLetter<Aminoacid>(const std::string& str, LetterTag<Aminoacid>) {
  return stringToAa(str);
}

template<typename Letter>
inline std::string letterToString(Letter letter);

template<>
inline std::string letterToString(Nucleotide letter) {
  return nucToString(letter);
}

template<>
inline std::string letterToString(Aminoacid letter) {
  return aaToString(letter);
}

safe_vector<Insertion> toInsertionsExternal(const safe_vector<InsertionInternal<Nucleotide>>& insertions);

safe_vector<Peptide> toPeptidesExternal(const safe_vector<PeptideInternal>& peptides);

safe_vector<RefPeptide> toRefPeptidesExternal(const safe_vector<RefPeptideInternal>& peptides);


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

inline std::ostream& operator<<(std::ostream& os, const Range& f) {
  os << "{ " << f.begin << ", " << f.end << " }";
  return os;
}

inline std::ostream& operator<<(std::ostream& os, const FrameShiftContext& f) {
  os << "{ "                        //
     << "codon: " << f.codon << ", "//
     << "}"                         //
    ;
  return os;
}


inline std::ostream& operator<<(std::ostream& os, const FrameShiftResult& f) {
  os << "{ "                                      //
     << "geneName: \"" << f.geneName << "\", "    //
     << "nucRel: " << f.nucRel << ", "            //
     << "nucAbs: " << f.nucAbs << ", "            //
     << "codon: " << f.codon << ", "              //
     << "gapsLeading: " << f.gapsLeading << ", "  //
     << "gapsTrailing: " << f.gapsTrailing << ", "//
     << "}"                                       //
    ;
  return os;
}
