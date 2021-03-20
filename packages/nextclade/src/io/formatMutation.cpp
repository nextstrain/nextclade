#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <string>

namespace Nextclade {
  std::string formatMutation(const NucleotideSubstitution& mut) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = mut.pos + 1;
    return fmt::format("{}{}{}", nucToChar(mut.refNuc), positionOneBased, nucToChar(mut.queryNuc));
  }

  std::string formatDeletion(const NucleotideDeletion& del) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto beginOne = del.start + 1;
    const auto endOne = del.start + del.length + 1;
    if (endOne - beginOne < 2) {
      return std::to_string(beginOne);
    }
    return fmt::format("{}-{}", beginOne, beginOne);
  }

  std::string formatInsertion(const NucleotideInsertion& insertion) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = insertion.pos + 1;
    const auto insertedSequence = toString(insertion.ins);
    return fmt::format("{}:{}", positionOneBased, insertedSequence);
  }
}// namespace Nextclade
