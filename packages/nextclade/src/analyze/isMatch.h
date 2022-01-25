#pragma once

#include <nextclade/nextclade.h>

namespace Nextclade {
  bool isMatch(Nucleotide query, Nucleotide reference);

  bool isMatch(Aminoacid query, Aminoacid reference);
}//namespace Nextclade
