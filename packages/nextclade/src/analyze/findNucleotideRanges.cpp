#include "findNucleotideRanges.h"

#include <common/safe_vector.h>
#include <nextalign/nextalign.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include "analyze/calculateTotalLength.h"
#include "utils/safe_cast.h"


namespace Nextclade {

  /**
   * Finds contiguous ranges (segments) in the sequence, such that for every character inside every range,
   * the predicate function returns true and every range contains only the same letter.
   *
   * The predicate is a function that takes a character and returns boolean.
   *
   * For example if predicate returns `true` for characters A and C, this function will find ranges `AAAA` and `CCCCC`,
   * but not `ZZZ` or `ACCCAC`.
   */
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

      // Find beginning of a range
      if (pred(c)) {
        begin = i;
        found = c;
      }

      // If there's a current range we are working on (for which we found a `begin`), extend it
      if (found) {
        // Rewind forward until we find a mismatch
        while (i < length && str[i] == *found) {
          ++i;
        }

        // We found the end of the current range, so now it's complete
        const auto& end = i;

        // Remember the range
        result.push_back(
          CharacterRange<Letter>{.begin = begin, .end = end, .length = end - begin, .character = *found});

        // Set current range to `nullopt`, meaning there is no current range we are working on
        found = {};
      } else if (i < length) {
        ++i;
      }
    }

    return result;
  }

  /**
   * Finds contiguous ranges (segments) in the sequence. Version for nucleotide sequences.
   * See the detailed explanation for the generic version above.
   */
  safe_vector<NucleotideRange> findNucleotideRanges(const NucleotideSequence& str,
    const std::function<bool(const Nucleotide&)>& pred) {
    return findCharacterRanges<Nucleotide>(str, pred);
  }

  /**
   * Finds contiguous ranges (segments) of a particular nucleotide in nucleotide sequence.
   */
  safe_vector<NucleotideRange> findNucleotideRanges(const NucleotideSequence& str, Nucleotide nuc) {
    return findNucleotideRanges(str, [&nuc](const Nucleotide& candidate) { return candidate == nuc; });
  }

  /**
   * Finds contiguous ranges (segments) in the sequence. Version for aminoacid sequences.
   * See the detailed explanation for the generic version above.
   */
  safe_vector<AminoacidRange> findAminoacidRanges(const AminoacidSequence& str,
    const std::function<bool(const Aminoacid&)>& pred) {
    return findCharacterRanges<Aminoacid>(str, pred);
  }

  /**
   * Finds contiguous ranges (segments) of a particular aminoacid in aminoacid sequence.
   */
  safe_vector<AminoacidRange> findAminoacidRanges(const AminoacidSequence& str, Aminoacid aa) {
    return findAminoacidRanges(str, [&aa](const Aminoacid& candidate) { return candidate == aa; });
  }

  /**
   * Finds contiguous ranges (segments) of a particular aminoacid in each gene.
   * See explanation for `findAminoacidRanges()` above.
   */
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
