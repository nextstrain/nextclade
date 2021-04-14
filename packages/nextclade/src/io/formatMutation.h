#pragma once

#include <boost/algorithm/string/join.hpp>
#include <string>
#include <vector>

namespace Nextclade {
  struct AminoacidDeletion;
  struct AminoacidSubstitution;
  struct ClusteredSnp;
  struct NucleotideDeletion;
  struct NucleotideInsertion;
  struct NucleotideRange;
  struct NucleotideSubstitution;
  struct PcrPrimerChange;
  struct Range;

  template<typename T, typename Formatter, typename Delimiter>
  std::string formatAndJoin(const std::vector<T>& elements, Formatter formatter, Delimiter delimiter) {
    std::vector<std::string> formatted;
    std::transform(elements.cbegin(), elements.cend(), std::back_inserter(formatted), formatter);
    return boost::algorithm::join(formatted, delimiter);
  }

  std::string formatRange(const Range& range);

  std::string formatMutation(const NucleotideSubstitution& mut);

  std::string formatDeletion(const NucleotideDeletion& del);

  std::string formatInsertion(const NucleotideInsertion& insertion);

  std::string formatMissing(const NucleotideRange& missing);

  std::string formatNonAcgtn(const NucleotideRange& nonAcgtn);

  std::string formatPcrPrimerChange(const PcrPrimerChange& primerChange);

  std::string formatAminoacidMutationWithoutGene(const AminoacidSubstitution& mut);

  std::string formatAminoacidMutation(const AminoacidSubstitution& mut);

  std::string formatAminoacidDeletion(const AminoacidDeletion& del);

  std::string formatClusteredSnp(const ClusteredSnp& csnp);
}// namespace Nextclade
