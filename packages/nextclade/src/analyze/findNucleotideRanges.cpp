#include "findNucleotideRanges.h"

#include <nextalign/nextalign.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <common/safe_vector.h>

#include "analyze/calculateTotalLength.h"
#include "utils/safe_cast.h"


namespace Nextclade {

  template<typename Letter>
  safe_vector<CharacterRange<Letter>> findCharacterRanges(const Sequence<Letter>& str,
    const std::function<bool(const Letter&)>& pred) {
    const auto& length = safe_cast<int>(str.length());
    safe_vector<CharacterRange<Letter>> result;

    int i = 0;
    std::optional<Letter> found;
    int begin = 0;
    while (i < length) {
      auto c = str[i];

      // find beginning of matching range
      if (pred(c)) {
        begin = i;
        found = c;
      }

      if (found) {
        // rewind forward to the end of matching range
        // TODO: the `i < length` was added to avoid buffer overrun. Double-check algorithmic correctness.
        while ((c == *found) && (i < length)) {
          ++i;
          c = str[i];
        }

        const auto& end = i;
        result.push_back(
          CharacterRange<Letter>{.begin = begin, .end = end, .length = end - begin, .character = *found});
        found = {};

        // TODO: the `i < length` was added to avoid buffer overrun. Double-check algorithmic correctness.
      } else if (i < length) {
        ++i;
      }
    }

    return result;
  }

  safe_vector<NucleotideRange> findNucleotideRanges(const NucleotideSequence& str,
    const std::function<bool(const Nucleotide&)>& pred) {
    return findCharacterRanges<Nucleotide>(str, pred);
  }

  safe_vector<NucleotideRange> findNucleotideRanges(const NucleotideSequence& str, Nucleotide nuc) {
    return findNucleotideRanges(str, [&nuc](const Nucleotide& candidate) { return candidate == nuc; });
  }

  safe_vector<AminoacidRange> findAminoacidRanges(const AminoacidSequence& str,
    const std::function<bool(const Aminoacid&)>& pred) {
    return findCharacterRanges<Aminoacid>(str, pred);
  }

  safe_vector<AminoacidRange> findAminoacidRanges(const AminoacidSequence& str, Aminoacid aa) {
    return findAminoacidRanges(str, [&aa](const Aminoacid& candidate) { return candidate == aa; });
  }

  safe_vector<GeneAminoacidRange> findAminoacidRangesPerGene(const safe_vector<PeptideInternal>& peptides,
    Aminoacid aa) {
    safe_vector<GeneAminoacidRange> geneAminoacidRanges;
    for (const auto& peptide : peptides) {
      auto ranges = findAminoacidRanges(peptide.seq, aa);
      const auto length = calculateTotalLength(ranges);
      if (length > 0) {
        geneAminoacidRanges.push_back(GeneAminoacidRange{
          .geneName = peptide.name,
          .character = aa,
          .ranges = std::move(ranges),
          .length = length,
        });
      }
    }

    return geneAminoacidRanges;
  }
}// namespace Nextclade
