#include "nucleotides.h"

#include <fmt/format.h>
#include <frozen/map.h>

#include <exception>

#include "../utils/contains.h"
#include "../utils/contract.h"
#include "../utils/map.h"

namespace {
  class ErrorNucleotideInvalid : public std::runtime_error {
  public:
    explicit ErrorNucleotideInvalid(char nuc) : std::runtime_error(fmt::format("Invalid nucleotide: \"{:c}\"", nuc)) {}
  };

  static constexpr const frozen::map<char, Nucleotide, 17> charToNucleotide = {
    /* 00 */ {'U', Nucleotide::U},
    /* 01 */ {'T', Nucleotide::T},
    /* 02 */ {'A', Nucleotide::A},
    /* 03 */ {'W', Nucleotide::W},
    /* 04 */ {'C', Nucleotide::C},
    /* 05 */ {'Y', Nucleotide::Y},
    /* 06 */ {'M', Nucleotide::M},
    /* 07 */ {'H', Nucleotide::H},
    /* 08 */ {'G', Nucleotide::G},
    /* 09 */ {'K', Nucleotide::K},
    /* 10 */ {'R', Nucleotide::R},
    /* 11 */ {'D', Nucleotide::D},
    /* 12 */ {'S', Nucleotide::S},
    /* 13 */ {'B', Nucleotide::B},
    /* 14 */ {'V', Nucleotide::V},
    /* 15 */ {'N', Nucleotide::N},
    /* 16 */ {'-', Nucleotide::GAP},
  };

  static constexpr const frozen::map<Nucleotide, char, 17> nucleotideToChar = {
    /* 00 */ {Nucleotide::U, 'U'},
    /* 01 */ {Nucleotide::T, 'T'},
    /* 02 */ {Nucleotide::A, 'A'},
    /* 03 */ {Nucleotide::W, 'W'},
    /* 04 */ {Nucleotide::C, 'C'},
    /* 05 */ {Nucleotide::Y, 'Y'},
    /* 06 */ {Nucleotide::M, 'M'},
    /* 07 */ {Nucleotide::H, 'H'},
    /* 08 */ {Nucleotide::G, 'G'},
    /* 09 */ {Nucleotide::K, 'K'},
    /* 10 */ {Nucleotide::R, 'R'},
    /* 11 */ {Nucleotide::D, 'D'},
    /* 12 */ {Nucleotide::S, 'S'},
    /* 13 */ {Nucleotide::B, 'B'},
    /* 14 */ {Nucleotide::V, 'V'},
    /* 15 */ {Nucleotide::N, 'N'},
    /* 16 */ {Nucleotide::GAP, '-'},
  };

}// namespace


Nucleotide toNucleotide(char nuc) {
  const auto it = charToNucleotide.find(nuc);
  if (it == charToNucleotide.end()) {
    throw ErrorNucleotideInvalid(nuc);
  }
  return it->second;
}

char nucToChar(Nucleotide nuc) {
  precondition(contains(nucleotideToChar, nuc));
  const auto it = nucleotideToChar.find(nuc);
  return it->second;
}


NucleotideSequence toNucleotideSequence(const std::string& seq) {
  return map(seq, std::function<Nucleotide(char)>(toNucleotide));
}

std::string toString(const NucleotideSequence& seq) {
  return map(seq, std::function<char(Nucleotide)>(nucToChar));
}

