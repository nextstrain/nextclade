#include "extractGene.h"

#include <common/safe_vector.h>
#include <frozen/string.h>
#include <nextalign/nextalign.h>

#include "../align/alignPairwise.h"
#include "../utils/at.h"
#include "../utils/safe_cast.h"
#include "./removeGaps.h"
#include "mapCoordinates.h"

namespace details {
  template<typename IntS, typename IntL>
  inline NucleotideSequenceSpan subspan(const NucleotideSequenceSpan& s, IntS start, IntL length) {
    invariant_greater_equal(start, 0);
    invariant_less(start, s.size());
    invariant_greater_equal(length, 0);
    invariant_less_equal(start + length, s.size());
    return s.subspan(safe_cast<size_t>(start), safe_cast<size_t>(length));
  }
}// namespace details


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

/**
 * Find the first non-GAP nucleotide and replace GAPs in the corresponding codon with Ns,
 * so that it's not getting stripped. This is to ensure the first codon is complete
 * and no shift is introduced during subsequent gap-stripping
 */
void protectFirstCodonInPlace(NucleotideSequence& seq) {
  const auto& length = safe_cast<int>(seq.size());
  const auto end = length - (length % 3);
  NucleotideSequenceSpan seqSpan = seq;

  for (int i = 0; i < end; ++i) {
    if (::at(seqSpan, i) != Nucleotide::GAP) {
      const auto codonBegin = i - (i % 3);
      invariant_greater_equal(codonBegin, 0);
      invariant_less(codonBegin + 2, length);

      const auto codon = details::subspan(seqSpan, codonBegin, 3);
      protectCodonInPlace(codon.begin());
      break;
    }
  }
}

/**
 * Extracts gene from the query sequence according to coordinate map relative to the reference sequence
 */
ExtractGeneStatus extractGeneQuery(const NucleotideSequenceView& query, const Gene& gene,
  const CoordinateMapper& coordMap) {
  precondition_less(gene.start, gene.end);

  // Transform gene coordinates according to coordinate map
  const auto geneAln = coordMap.refToAln(Range{gene.start, gene.end});

  // Start and end should be within bounds
  invariant_less(geneAln.begin, query.size());
  invariant_less_equal(geneAln.end, query.size());

  auto result = NucleotideSequence(query.substr(geneAln.begin, geneAln.length()));
  const auto resultLength = safe_cast<int>(result.size());

  if (resultLength == 0) {
    auto error = fmt::format(                                                             //
      "When extracting gene \"{:s}\": The gene ended up being empty after gap stripping. "//
      "Gene coordinates: "                                                                //
      "start: {:d}, end: {:d}, length: {:d}"                                              //
      ,
      gene.geneName, gene.start, gene.end, gene.length);

    return ExtractGeneStatus{
      .status = Status::Error,
      .reason = ExtractGeneStatusReason::GeneEmpty,
      .error = std::move(error),
      .result = {},
    };
  }

  invariant_less_equal(result.size(), query.size());// Length of the gene should not exceed the length of the sequence
  return ExtractGeneStatus{
    .status = Status::Success,
    .reason = {},
    .error = {},
    .result = std::move(result),
  };
}
