#include "nucleotide.h"

#include <frozen/set.h>
#include <nextalign/nextalign.h>

#include "../utils/mapFind.h"

namespace Nextclade {

  namespace {
    constexpr const auto ACGT = frozen::set<Nucleotide, 4>({
      Nucleotide::A,
      Nucleotide::C,
      Nucleotide::G,
      Nucleotide::T,
    });

    constexpr const auto ACGTN_AND_GAP = frozen::set<Nucleotide, 6>({
      Nucleotide::A,
      Nucleotide::C,
      Nucleotide::G,
      Nucleotide::T,
      Nucleotide::N,
      Nucleotide::GAP,
    });

  }// namespace


  bool isGap(Nucleotide nuc) {
    return nuc == Nucleotide::GAP;
  }

  bool isAcgt(Nucleotide nuc) {
    return has(ACGT, nuc);
  }

  bool isNotAcgt(Nucleotide nuc) {
    return !isAcgt(nuc);
  }

  bool isNonAcgtnAndNonGap(const Nucleotide& nuc) {
    return !has(ACGTN_AND_GAP, nuc);
  }

}// namespace Nextclade
