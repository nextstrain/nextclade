#include "formatMutation.h"

#include <common/contract.h>
#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <string>

#include "../utils/map.h"
#include "utils/concat.h"

namespace Nextclade {
  std::string formatRange(const Range& range) {
    precondition_less(range.begin, range.end);

    if (range.begin >= range.end) {
      return "empty range";
    }

    // NOTE: we (and C++ standard library) uses 0-based half-open ranges,
    // but bioinformaticians prefer 1-based, closed ranges
    const auto beginOne = range.begin + 1;
    const auto endOne = range.end;
    if (endOne == beginOne) {
      return std::to_string(beginOne);
    }
    return fmt::format("{}-{}", beginOne, endOne);
  }

  std::string formatFrameShiftRange(const Range& range) {
    return formatRange(Range{.begin = range.begin, .end = range.end});
  }

  std::string formatGenotype(const Genotype<Nucleotide>& mut) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = mut.pos + 1;
    return fmt::format("{}{}", positionOneBased, nucToString(mut.qry));
  }

  std::string formatGenotype(const Genotype<Aminoacid>& mut) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = mut.pos + 1;
    return fmt::format("{}{}", positionOneBased, aaToString(mut.qry));
  }

  std::string formatMutationSimple(const NucleotideSubstitutionSimple& mut) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = mut.pos + 1;
    return fmt::format("{}{}{}", nucToString(mut.ref), positionOneBased, nucToString(mut.qry));
  }

  std::string formatDeletionSimple(const NucleotideDeletionSimple& del) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = del.pos + 1;
    return fmt::format("{}{}{}", nucToString(del.ref), positionOneBased, "-");
  }

  std::string formatMutationLabels(const std::vector<std::string>& labels) {
    return boost::join(labels, "&");
  }

  std::string formatMutationSimpleLabeled(const NucleotideSubstitutionSimpleLabeled& sub) {
    auto mut = formatMutationSimple(sub.substitution);
    auto labels = formatMutationLabels(sub.labels);
    return fmt::format("{}|{}", mut, labels);
  }

  std::string formatDeletionSimpleLabeled(const NucleotideDeletionSimpleLabeled& del) {
    auto mut = formatDeletionSimple(del.deletion);
    auto labels = formatMutationLabels(del.labels);
    return fmt::format("{}|{}", mut, labels);
  }

  std::string formatAminoacidMutationSimpleWithoutGene(const AminoacidSubstitutionSimple& mut) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = mut.pos + 1;
    return fmt::format("{}{}{}", aaToString(mut.ref), positionOneBased, aaToString(mut.qry));
  }

  std::string formatAminoacidDeletionSimpleWithoutGene(const AminoacidDeletionSimple& del) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = del.pos + 1;
    return fmt::format("{}{}{}", aaToString(del.ref), positionOneBased, "-");
  }

  std::string formatMutation(const NucleotideSubstitution& mut) {
    return formatMutationSimple(NucleotideSubstitutionSimple{
      .ref = mut.ref,
      .pos = mut.pos,
      .qry = mut.qry,
    });
  }

  std::string formatDeletion(const NucleotideDeletion& del) {
    return formatRange(Range{.begin = del.start, .end = del.start + del.length});
  }

  std::string formatMissing(const NucleotideRange& missing) {
    return formatRange({.begin = missing.begin, .end = missing.end});
  }

  std::string formatNonAcgtn(const NucleotideRange& nonAcgtn) {
    const auto range = formatRange({.begin = nonAcgtn.begin, .end = nonAcgtn.end});
    return fmt::format("{}:{}", nucToString(nonAcgtn.character), range);
  }

  std::string formatPcrPrimerChange(const PcrPrimerChange& primerChange) {
    const auto& name = primerChange.primer.name;
    const auto& muts = formatAndJoin(primerChange.substitutions, formatMutation, ";");
    return fmt::format("{}:{}", name, muts);
  }

  std::string formatAminoacidMutationWithoutGene(const AminoacidSubstitution& mut) {
    // NOTE: by convention, in bioinformatics, aminoacids are numbered starting from 1, however our arrays are 0-based
    const auto codonOneBased = mut.pos + 1;
    const auto ref = aaToString(mut.ref);
    const auto query = aaToString(mut.qry);
    return fmt::format("{}{}{}", ref, codonOneBased, query);
  }

  std::string formatAminoacidMutation(const AminoacidSubstitution& mut) {
    const auto& gene = mut.gene;
    const auto notation = formatAminoacidMutationWithoutGene(mut);
    return fmt::format("{}:{}", gene, notation);
  }

  std::string formatAminoacidDeletionWithoutGene(const AminoacidDeletion& del) {
    // NOTE: by convention, in bioinformatics, aminoacids are numbered starting from 1, however our arrays are 0-based
    const auto codonOneBased = del.pos + 1;
    const auto ref = aaToString(del.ref);
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

  std::string formatFrameShift(const FrameShiftResult& frameShift) {
    return fmt::format("{}:{}", frameShift.geneName, formatFrameShiftRange(frameShift.codon));
  }

  std::string formatStopCodon(const StopCodonLocation& stopCodon) {
    return fmt::format("{}:{}", stopCodon.geneName, stopCodon.codon);
  }
}// namespace Nextclade
