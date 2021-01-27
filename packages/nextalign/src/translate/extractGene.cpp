#include "extractGene.h"

#include <frozen/string.h>
#include <nextalign/nextalign.h>

#include <vector>

#include "../align/alignPairwise.h"
#include "../utils/safe_cast.h"
#include "./removeGaps.h"


NucleotideSequenceView extractGeneRef(const NucleotideSequenceView& ref, const Gene& gene) {
  precondition_less(gene.length, ref.size());
  precondition_less_equal(gene.length, ref.size());
  return ref.substr(gene.start, gene.length);
}

/**
 * Replaces first or second gap in the non-all-gap codon with N
 */
template<typename SpanIterator>
void protectCodonInPlace(SpanIterator it) {
  if (it[0] == Nucleotide::GAP) {
    it[0] = Nucleotide::N;

    if (it[1] == Nucleotide::GAP) {
      it[1] = Nucleotide::N;

      precondition_not_equal(it[2], Nucleotide::GAP);// Should not protect all-gap codon
    }
  }
}

void stripGeneInPlace(NucleotideSequence& seq) {
  precondition_divisible_by(seq.size(), 3);

  const auto& length = safe_cast<int>(seq.size());
  NucleotideSequenceSpan seqSpan = seq;

  // Find the first non-GAP codon and replace GAPs with Ns in it, so that it's not getting stripped
  for (int i = 0; i < length; ++i) {
    if (seqSpan[i] != Nucleotide::GAP) {
      const auto codonBegin = i - i % 3;
      invariant_greater_equal(codonBegin, 0);
      invariant_less(codonBegin + 2, length);

      const auto codon = seqSpan.subspan(codonBegin, 3);
      protectCodonInPlace(codon.begin());
      break;
    }
  }

  // Find the last non-GAP codon and replace GAPs with Ns in it, so that it's not getting stripped
  for (int i = length - 1; i >= 0; --i) {
    if (seqSpan[i] != Nucleotide::GAP) {
      const auto codonBegin = i - i % 3;
      invariant_greater_equal(codonBegin, 0);
      invariant_less(codonBegin + 2, length);

      const auto codon = seqSpan.subspan(codonBegin, 3);
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
  precondition_less(gene.end, coordMap.size());

  // Transform gene coordinates according to coordinate map
  const auto start = coordMap[gene.start];
  const auto end = coordMap[gene.end];// TODO: `gene.end` -1 or not?
  const auto length = end - start;
  // Start and end should be within bounds
  invariant_less(start, query.size());
  invariant_less(end, query.size());


  auto result = NucleotideSequence(query.substr(start, length));
  stripGeneInPlace(result);

  const auto resultLength = safe_cast<int>(result.size());
  if (resultLength % 3 != 0) {
    throw ErrorExtractGeneLengthInvalid(gene.geneName, resultLength);
  }

  invariant_less_equal(result.size(), query.size());// Length of the gene should not exceed the length of the sequence
  return result;
}
