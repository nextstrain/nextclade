#include "extractGene.h"

#include <frozen/string.h>
#include <nextalign/nextalign.h>

#include <vector>

#include "../align/alignPairwise.h"
#include "../utils/safe_cast.h"
#include "./removeGaps.h"

namespace details {
  template<typename IntS, typename IntL>
  inline NucleotideSequenceView substr(const NucleotideSequenceView& s, IntS start, IntL length) noexcept(false) {
    invariant_greater_equal(start, 0);
    invariant_less(start, s.size());
    invariant_greater_equal(length, 0);
    invariant_less(start + length, s.size());
    return s.substr(safe_cast<size_t>(start), safe_cast<size_t>(length));
  }

  template<typename IntS, typename IntL>
  inline NucleotideSequenceSpan subspan(const NucleotideSequenceSpan& s, IntS start, IntL length) {
    invariant_greater_equal(start, 0);
    invariant_less(start, s.size());
    invariant_greater_equal(length, 0);
    invariant_less_equal(start + length, s.size());
    return s.subspan(safe_cast<size_t>(start), safe_cast<size_t>(length));
  }

  template<typename Container, typename Index>
  inline const typename Container::value_type& at(const Container& container, Index index) {
    const auto i = safe_cast<typename Container::size_type>(index);
    invariant_greater_equal(i, 0);
    invariant_less(i, container.size());
    return container[i];
  }

}// namespace details

NucleotideSequenceView extractGeneRef(const NucleotideSequenceView& ref, const Gene& gene) {
  precondition_less(gene.length, ref.size());
  precondition_less_equal(gene.length, ref.size());
  return details::substr(ref, gene.start, gene.length);
}

/**
 * Replaces first or second gap in a not-all-gap codon with N
 */
template<typename SpanIterator>
void protectCodonInPlace(SpanIterator it) {
  if (it[0] == Nucleotide::GAP) {
    it[0] = Nucleotide::N;

    if (it[1] == Nucleotide::GAP) {
      it[1] = Nucleotide::N;

      precondition_not_equal(it[2], Nucleotide::GAP);// Should last position in codon should not be a gap
    }
  }
}

void stripGeneInPlace(NucleotideSequence& seq) {
  const auto& length = safe_cast<int>(seq.size());
  const auto end = length - (length % 3);
  NucleotideSequenceSpan seqSpan = seq;

  // Find the first non-GAP nucleotide and replace GAPs in the corresponding codon with Ns, so that it's not getting stripped
  for (int i = 0; i < end; ++i) {
    if (at(seqSpan, i) != Nucleotide::GAP) {
      const auto codonBegin = i - (i % 3);
      invariant_greater_equal(codonBegin, 0);
      invariant_less(codonBegin + 2, length);

      const auto codon = details::subspan(seqSpan, codonBegin, 3);
      protectCodonInPlace(codon.begin());
      break;
    }
  }

  // Find the last non-GAP nucleotide and replace GAPs in the corresponding codon with Ns, so that it's not getting stripped
  // NOTE: Due to insertions elsewhere in the sequence, the beginning of a codon is not necessarily
  // a position with i % 3 == 0. Assuming the 3' end of the gene is in frame, we use
  // the frame a the end (lastFrame) as the reference frame for the end of the gene
  const auto& lastFrame = length % 3;
  for (int i = length - 1; i >= 0; --i) {
    if (at(seqSpan, i) != Nucleotide::GAP) {
      const auto codonBegin = i - ((i - lastFrame) % 3);
      invariant_greater_equal(codonBegin, 0);
      invariant_less(codonBegin + 2, length);

      const auto codon = details::subspan(seqSpan, codonBegin, 3);
      protectCodonInPlace(codon.rbegin());// Note: reverse iterator - going from end to begin
      break;
    }
  }

  // Remove all GAP characters from everywhere (Note: including the full gap-only codons at the edges)
  removeGapsInPlace(seq);
}

/**
 * Extracts gene from the query sequence according to coordinate map relative to the reference sequence
 */
NucleotideSequence extractGeneQuery(
  const NucleotideSequenceView& query, const Gene& gene, const std::vector<int>& coordMap) {
  precondition_less(gene.start, coordMap.size());
  precondition_less_equal(gene.end, coordMap.size());
  precondition_less(gene.start, gene.end);

  // Transform gene coordinates according to coordinate map
  const auto start = details::at(coordMap, gene.start);
  // gene.end is the position after the last base of the gene (0-based indexing)
  // the corresponding base in the query is hence found by coordMap[gene.end-1]
  // we add 1 to make that end be again after the last base of the gene.
  // with this addition: length = end - start
  const auto end = details::at(coordMap, gene.end - 1) + 1;
  const auto length = end - start;
  // Start and end should be within bounds
  invariant_less(start, query.size());
  invariant_less_equal(end, query.size());


  auto result = NucleotideSequence(details::substr(query, start, length));
  const auto resultLengthPreStrip = safe_cast<int>(result.size());

  stripGeneInPlace(result);
  const auto resultLength = safe_cast<int>(result.size());

  if (resultLength == 0) {
    throw ErrorExtractStrippedGeneEmpty(gene, resultLengthPreStrip);
  }

  if (resultLength % 3 != 0) {
    throw ErrorExtractGeneStrippedLengthNonMul3(gene, resultLength, resultLengthPreStrip);
  }

  invariant_less_equal(result.size(), query.size());// Length of the gene should not exceed the length of the sequence
  return result;
}
