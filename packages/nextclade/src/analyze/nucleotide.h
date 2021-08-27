#pragma once
#include <nextalign/nextalign.h>

namespace Nextclade {

  bool isGap(Nucleotide nuc);

  bool isAcgt(Nucleotide nuc);

  bool isNotAcgt(Nucleotide nuc);

  bool isNonAcgtnAndNonGap(const Nucleotide& nuc);

}// namespace Nextclade
