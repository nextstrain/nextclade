#pragma once


#include <nextalign/nextalign.h>

#include "nextalign/private/nextalign_private.h"


Nucleotide complement(Nucleotide nuc);

void reverseComplementInPlace(NucleotideSequence& seq);

Aminoacid decode(const NucleotideSequenceView& codon);

class ErrorComplementUnknownNucleotide : public ErrorFatal {
public:
  explicit ErrorComplementUnknownNucleotide(const std::string& nuc);
};
