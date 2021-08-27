#pragma once

#include <nextclade/nextclade.h>

namespace Nextclade {
  NucleotideChangesReport findNucChanges(  //
    const NucleotideSequence& refStripped, //
    const NucleotideSequence& queryStripped//
  );                                       //
}// namespace Nextclade
