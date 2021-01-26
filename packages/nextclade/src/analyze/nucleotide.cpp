#include "nucleotide.h"

#include <frozen/set.h>
#include <nextalign/nextalign.h>

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
    return ACGT.find(nuc) == ACGT.end();
  }

  bool isNonAcgtnAndNonGap(const Nucleotide& nuc) {
    return ACGTN_AND_GAP.find(nuc) == ACGTN_AND_GAP.end();
  }

}// namespace Nextclade
