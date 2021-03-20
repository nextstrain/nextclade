#pragma once

#include <string>

namespace Nextclade {
  struct NucleotideSubstitution;

  NucleotideSubstitution parseMutation(const std::string& raw);
}// namespace Nextclade
