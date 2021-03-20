#pragma once

#include <string>

namespace Nextclade {
  struct NucleotideSubstitution;

  std::string formatMutation(const NucleotideSubstitution& mut);

  std::string formatDeletion(const NucleotideDeletion& del);

  std::string formatInsertion(const NucleotideInsertion& insertion);
}// namespace Nextclade
