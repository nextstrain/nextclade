#pragma once
#include <nextalign/nextalign.h>

namespace Nextclade {

  bool isAcgt(Nucleotide nuc);

  bool isNotAcgt(Nucleotide nuc);

  bool isNonAcgtnAndNonGap(const Nucleotide& nuc);

}// namespace Nextclade
