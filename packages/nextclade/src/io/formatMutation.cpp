#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <boost/algorithm/string/join.hpp>
#include <string>

namespace Nextclade {
  namespace {
    template<typename T, typename Formatter, typename Delimiter>
    std::string formatAndJoin(const std::vector<T>& elements, Formatter formatter, Delimiter delimiter) {
      std::vector<std::string> formatted;
      std::transform(elements.cbegin(), elements.cend(), std::back_inserter(formatted), formatter);
      return boost::algorithm::join(formatted, delimiter);
    }
  }// namespace

  std::string formatRange(const Range& range) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto beginOne = range.begin + 1;
    const auto endOne = range.end + 1;
    if (endOne - beginOne < 2) {
      return std::to_string(beginOne);
    }
    return fmt::format("{}-{}", beginOne, endOne);
  }

  std::string formatMutation(const NucleotideSubstitution& mut) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = mut.pos + 1;
    return fmt::format("{}{}{}", nucToChar(mut.refNuc), positionOneBased, nucToChar(mut.queryNuc));
  }

  std::string formatDeletion(const NucleotideDeletion& del) {
    return formatRange(Range{.begin = del.start, .end = del.start + del.length});
  }

  std::string formatInsertion(const NucleotideInsertion& insertion) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = insertion.pos + 1;
    const auto insertedSequence = toString(insertion.ins);
    return fmt::format("{}:{}", positionOneBased, insertedSequence);
  }

  std::string formatMissing(const NucleotideRange& missing) {
    return formatRange({.begin = missing.begin, .end = missing.end});
  }

  std::string formatNonAcgtn(const NucleotideRange& nonAcgtn) {
    const auto range = formatRange({.begin = nonAcgtn.begin, .end = nonAcgtn.end});
    return fmt::format("{}:{}", nucToChar(nonAcgtn.nuc), range);
  }

  std::string formatPcrPrimerChange(const PcrPrimerChange& primerChange) {
    const auto& name = primerChange.primer.name;
    const auto& muts = formatAndJoin(primerChange.substitutions, formatMutation, ";");
    return fmt::format("{}:{}", name, muts);
  }

  namespace {
    std::string formatAminoacidMutationWithoutGene(const AminoacidSubstitution& mut) {
      // NOTE: by convention, in bioinformatics, aminoacids are numbered starting from 1, however our arrays are 0-based
      const auto codonOneBased = mut.codon + 1;
      const auto ref = aaToChar(mut.refAA);
      const auto query = (mut.queryAA);
      return fmt::format("{}{}{}", ref, codonOneBased, query);
    }
  }// namespace

  std::string formatAminoacidMutation(const AminoacidSubstitution& mut) {
    const auto& gene = mut.gene;
    const auto notation = formatAminoacidMutationWithoutGene(mut);
    return fmt::format("{}:{}", gene, notation);
  }

  std::string formatAminoacidDeletion(const AminoacidDeletion& del) {
    const auto& gene = del.gene;
    const auto notation = formatAminoacidMutationWithoutGene(AminoacidSubstitution{
      .refAA = del.refAA,
      .codon = del.codon,
      .queryAA = Aminoacid::GAP,
      .gene = del.gene,
      .nucRange = del.nucRange,
      .refCodon = del.refCodon,
      .queryCodon = toNucleotideSequence("---"),
    });
    return fmt::format("{}:{}", gene, notation);
  }

  std::string formatClusteredSnp(const ClusteredSnp& csnp) {
    const auto range = formatRange(Range{.begin = csnp.start, .end = csnp.end});
    const auto numberOfSNPs = std::to_string(csnp.numberOfSNPs);
    return fmt::format("{}:{}", range, numberOfSNPs);
  }
}// namespace Nextclade
