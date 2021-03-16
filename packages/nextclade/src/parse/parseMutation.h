#pragma once

#include <string>

namespace Nextclade {

  struct NucleotideSubstitution;

  NucleotideSubstitution parseMutation(const std::string& raw);

  std::string formatMutation(const NucleotideSubstitution& mut);

}// namespace Nextclade
