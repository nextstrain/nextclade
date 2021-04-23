#pragma once

#include <nextclade/nextclade.h>

namespace Nextclade {
  AnalysisResult analyze(const NucleotideSequence& query, const NucleotideSequence& ref);
}// namespace Nextclade
