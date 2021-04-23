#include "formatMutation.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <string>

namespace Nextclade {
  std::string formatRange(const Range& range) {
    // NOTE: we (and C++ standard library) uses 0-based half-open ranges,
    // but bioinformaticians prefer 1-based, closed ranges
    const auto beginOne = range.begin + 1;
    const auto endOne = range.end;
    if (endOne == beginOne) {
      return std::to_string(beginOne);
    }
    return fmt::format("{}-{}", beginOne, endOne);
  }

  std::string formatMutation(const NucleotideSubstitution& mut) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = mut.pos + 1;
    return fmt::format("{}{}{}", nucToString(mut.refNuc), positionOneBased, nucToString(mut.queryNuc));
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

  std::string formatInsertions(const std::vector<NucleotideInsertion>& insertions) {
    return formatAndJoin(insertions, formatInsertion, ";");
  }

  std::string formatMissing(const NucleotideRange& missing) {
    return formatRange({.begin = missing.begin, .end = missing.end});
  }

  std::string formatNonAcgtn(const NucleotideRange& nonAcgtn) {
    const auto range = formatRange({.begin = nonAcgtn.begin, .end = nonAcgtn.end});
    return fmt::format("{}:{}", nucToString(nonAcgtn.nuc), range);
  }

  std::string formatPcrPrimerChange(const PcrPrimerChange& primerChange) {
    const auto& name = primerChange.primer.name;
    const auto& muts = formatAndJoin(primerChange.substitutions, formatMutation, ";");
    return fmt::format("{}:{}", name, muts);
  }

  std::string formatAminoacidMutationWithoutGene(const AminoacidSubstitution& mut) {
    // NOTE: by convention, in bioinformatics, aminoacids are numbered starting from 1, however our arrays are 0-based
    const auto codonOneBased = mut.codon + 1;
    const auto ref = aaToString(mut.refAA);
    const auto query = aaToString(mut.queryAA);
    return fmt::format("{}{}{}", ref, codonOneBased, query);
  }

  std::string formatAminoacidMutation(const AminoacidSubstitution& mut) {
    const auto& gene = mut.gene;
    const auto notation = formatAminoacidMutationWithoutGene(mut);
    return fmt::format("{}:{}", gene, notation);
  }

  std::string formatAminoacidDeletionWithoutGene(const AminoacidDeletion& del) {
    // NOTE: by convention, in bioinformatics, aminoacids are numbered starting from 1, however our arrays are 0-based
    const auto codonOneBased = del.codon + 1;
    const auto ref = aaToString(del.refAA);
    return fmt::format("{}{}-", ref, codonOneBased);
  }

  std::string formatAminoacidDeletion(const AminoacidDeletion& del) {
    const auto& gene = del.gene;
    const auto notation = formatAminoacidDeletionWithoutGene(del);
    return fmt::format("{}:{}", gene, notation);
  }

  std::string formatClusteredSnp(const ClusteredSnp& csnp) {
    const auto range = formatRange(Range{.begin = csnp.start, .end = csnp.end});
    const auto numberOfSNPs = std::to_string(csnp.numberOfSNPs);
    return fmt::format("{}:{}", range, numberOfSNPs);
  }
}// namespace Nextclade
