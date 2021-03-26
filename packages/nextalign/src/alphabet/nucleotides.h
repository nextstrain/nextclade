#pragma once

#include <nextalign/nextalign.h>

#include <gsl/string_span>
#include <string>

#include "../utils/to_underlying.h"
#include "nextalign/private/nextalign_private.h"

using NucleotideSequenceSpan = SequenceSpan<Nucleotide>;

Nucleotide toNucleotide(char nuc);

char nucToChar(Nucleotide nuc);

std::string nucToString(Nucleotide nuc);

inline std::ostream& operator<<(std::ostream& os, const Nucleotide& nucleotide) {
  os << nucToString(nucleotide);
  return os;
}
