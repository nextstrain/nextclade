#include "aminoacids.h"

#include <fmt/format.h>
#include <frozen/map.h>

#include <exception>

#include "../utils/contains.h"
#include "../utils/contract.h"
#include "../utils/map.h"

namespace {
  class ErrorAminoacidInvalid : public std::runtime_error {
  public:
    explicit ErrorAminoacidInvalid(char aa) : std::runtime_error(fmt::format("Invalid aminoacid: \"{:c}\"", aa)) {}
  };

  static constexpr const frozen::map<char, Aminoacid, 28> charToAminoacid = {
    /* 00 */ {'A', Aminoacid::A},
    /* 01 */ {'B', Aminoacid::B},
    /* 02 */ {'C', Aminoacid::C},
    /* 03 */ {'D', Aminoacid::D},
    /* 04 */ {'E', Aminoacid::E},
    /* 05 */ {'F', Aminoacid::F},
    /* 06 */ {'G', Aminoacid::G},
    /* 07 */ {'H', Aminoacid::H},
    /* 08 */ {'I', Aminoacid::I},
    /* 09 */ {'J', Aminoacid::J},
    /* 10 */ {'K', Aminoacid::K},
    /* 11 */ {'L', Aminoacid::L},
    /* 12 */ {'M', Aminoacid::M},
    /* 13 */ {'N', Aminoacid::N},
    /* 14 */ {'O', Aminoacid::O},
    /* 15 */ {'P', Aminoacid::P},
    /* 16 */ {'Q', Aminoacid::Q},
    /* 17 */ {'R', Aminoacid::R},
    /* 18 */ {'S', Aminoacid::S},
    /* 19 */ {'T', Aminoacid::T},
    /* 20 */ {'U', Aminoacid::U},
    /* 21 */ {'V', Aminoacid::V},
    /* 22 */ {'W', Aminoacid::W},
    /* 23 */ {'Y', Aminoacid::Y},
    /* 24 */ {'Z', Aminoacid::Z},
    /* 25 */ {CHAR_AMINOACID_UNKNOWN, Aminoacid::X},
    /* 26 */ {CHAR_AMINOACID_STOP, Aminoacid::STOP},
    /* 27 */ {CHAR_AMINOACID_GAP, Aminoacid::GAP},
  };

  static constexpr const frozen::map<Aminoacid, char, 28> aminoacidToChar = {
    /* 00 */ {Aminoacid::A, 'A'},
    /* 01 */ {Aminoacid::B, 'B'},
    /* 02 */ {Aminoacid::C, 'C'},
    /* 03 */ {Aminoacid::D, 'D'},
    /* 04 */ {Aminoacid::E, 'E'},
    /* 05 */ {Aminoacid::F, 'F'},
    /* 06 */ {Aminoacid::G, 'G'},
    /* 07 */ {Aminoacid::H, 'H'},
    /* 08 */ {Aminoacid::I, 'I'},
    /* 09 */ {Aminoacid::J, 'J'},
    /* 10 */ {Aminoacid::K, 'K'},
    /* 11 */ {Aminoacid::L, 'L'},
    /* 12 */ {Aminoacid::M, 'M'},
    /* 13 */ {Aminoacid::N, 'N'},
    /* 14 */ {Aminoacid::O, 'O'},
    /* 15 */ {Aminoacid::P, 'P'},
    /* 16 */ {Aminoacid::Q, 'Q'},
    /* 17 */ {Aminoacid::R, 'R'},
    /* 18 */ {Aminoacid::S, 'S'},
    /* 19 */ {Aminoacid::T, 'T'},
    /* 20 */ {Aminoacid::U, 'U'},
    /* 21 */ {Aminoacid::V, 'V'},
    /* 22 */ {Aminoacid::W, 'W'},
    /* 23 */ {Aminoacid::Y, 'Y'},
    /* 24 */ {Aminoacid::Z, 'Z'},
    /* 25 */ {Aminoacid::X, CHAR_AMINOACID_UNKNOWN},
    /* 26 */ {Aminoacid::STOP, CHAR_AMINOACID_STOP},
    /* 27 */ {Aminoacid::GAP, CHAR_AMINOACID_GAP},
  };

}// namespace

Aminoacid charToAa(char aa) {
  const auto it = charToAminoacid.find(aa);
  if (it == charToAminoacid.end()) {
    throw ErrorAminoacidInvalid(aa);
  }
  return it->second;
}

char aaToChar(Aminoacid aa) {
  precondition(contains(aminoacidToChar, aa));
  const auto it = aminoacidToChar.find(aa);
  return it->second;
}

AminoacidSequence toAminoacidSequence(const std::string& seq) {
  return map(seq, std::function<Aminoacid(char)>(charToAa));
}

std::string toString(const AminoacidSequence& seq) {
  return map(seq, std::function<char(Aminoacid)>(aaToChar));
}
