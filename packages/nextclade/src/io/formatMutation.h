#pragma once

#include <string>

namespace Nextclade {
  struct NucleotideSubstitution;
  struct NucleotideDeletion;
  struct NucleotideInsertion;
  struct Range;
  struct NucleotideRange;
  struct PcrPrimerChange;

  std::string formatRange(const Range& range);

  std::string formatMutation(const NucleotideSubstitution& mut);

  std::string formatDeletion(const NucleotideDeletion& del);

  std::string formatInsertion(const NucleotideInsertion& insertion);

  std::string formatMissing(const NucleotideRange& missing);

  std::string formatNonAcgtn(const NucleotideRange& nonAcgtn);

  std::string formatPcrPrimerChange(const PcrPrimerChange& primerChange);

  std::string formatAminoacidMutation(const AminoacidSubstitution& mut);

  std::string formatAminoacidDeletion(const AminoacidDeletion& del);

  std::string formatClusteredSnp(const ClusteredSnp& csnp);
}// namespace Nextclade
