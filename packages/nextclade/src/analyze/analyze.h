#pragma once

#include <nextclade/nextclade.h>

namespace Nextclade {
  NucMutationsReport findNucChanges(       //
    const NucleotideSequence& refStripped, //
    const NucleotideSequence& queryStripped//
  );                                       //
}// namespace Nextclade
