#include "extractGene.h"

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

  const auto unstripped = query.substr(start, length);
  auto stripped = removeGaps(unstripped);

  const auto numGaps = safe_cast<int>(unstripped.size() - stripped.size());
  if (numGaps % 3 != 0) {
    throw ErrorExtractGeneLengthInvalid(gene.geneName, numGaps);
  }

  invariant_less_equal(stripped.size(), query.size());// Length of the gene should not exceed the length of the sequence
  invariant_divisible_by(stripped.size(), 3);         // Gene length should be a multiple of 3
  return stripped;
}
