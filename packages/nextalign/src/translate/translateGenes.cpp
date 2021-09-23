#include "translateGenes.h"

#include <fmt/format.h>
#include <nextalign/nextalign.h>

#include <gsl/string_span>
#include <string>
#include <string_view>

#include "../alphabet/aminoacids.h"
#include "../alphabet/nucleotides.h"
#include "../strip/stripInsertions.h"
#include "./extractGene.h"
#include "./mapCoordinates.h"
#include "./translate.h"
#include "align/alignPairwise.h"
#include "detectFrameShifts.h"
#include "removeGaps.h"
#include "utils/at.h"
#include "utils/contains.h"
#include "utils/contract.h"


void maskNucFrameShiftsInPlace(NucleotideSequence& seq, const std::vector<FrameShiftResult>& frameShifts) {
  for (const auto& frameShift : frameShifts) {
    auto current = frameShift.nucRel.begin;
    const auto end = frameShift.nucRel.end;
    invariant_greater(current, 0);
    invariant_less_equal(end, seq.size());
    while (current < end) {
      if (seq[current] != Nucleotide::GAP) {
        seq[current] = Nucleotide::N;
      }
      ++current;
    }
  }
}

/**
 * Mask gaps in frame shifted regions of the peptide.
 * This region is likely misaligned, so these gaps added during peptide alignment don't make sense.
 */
void maskPeptideFrameShiftsInPlace(AminoacidSequence& seq,
  const std::vector<InternalFrameShiftResultWithMask>& frameShifts) {
  for (const auto& frameShift : frameShifts) {
    auto current = frameShift.codonMask.begin;
    const auto end = frameShift.codonMask.end;
    invariant_greater(current, 0);
    invariant_less_equal(end, seq.size());
    while (current < end) {
      if (seq[current] == Aminoacid::GAP) {
        seq[current] = Aminoacid::X;
      }
      ++current;
    }
  }
}

/**
 * Find beginning nucleotide position of a deletion that immedeatly preceeds and adjacent to the frame shift
 */
int findMaskBegin(const NucleotideSequence& seq, const FrameShiftResult& frameShift) {
  // From begin, rewind back to find the first adjacent nuc deletion
  int begin = frameShift.nucRel.begin;
  auto nuc = seq[begin];
  while (nuc == Nucleotide::GAP && begin >= 0) {
    --begin;
    nuc = seq[begin];
  }
  return begin;
}

/**
 * Find ending nucleotide position of a deletion that immedeatly follows and adjacent to the frame shift
 */
int findMaskEnd(const NucleotideSequence& seq, const FrameShiftResult& frameShift) {
  int length = safe_cast<int>(seq.size());
  // From end, rewind forward to find the last adjacent nuc deletion
  int end = frameShift.nucRel.end;
  if (end < length) {
    auto nuc = seq[end];
    while (nuc == Nucleotide::GAP && end < length) {
      ++end;
      nuc = seq[end];
    }
  }
  return end;
}

/**
 * Finds boundaries for frame shift masking range in codon coordinates.
 */
std::vector<InternalFrameShiftResultWithMask> findPeptideMask(//
  const NucleotideSequence& seq,                              //
  const std::vector<FrameShiftResult>& frameShifts,           //
  const std::vector<int>& coordMap,                           //
  const std::vector<int>& coordMapReverse,                    //
  const Gene& gene                                            //
) {
  // TODO: deduplicate coordinate translation code with the similar code in `translateFrameShifts()`
  std::vector<InternalFrameShiftResultWithMask> result;
  for (const auto& frameShift : frameShifts) {
    auto nucRangeRel = Range{
      .begin = findMaskBegin(seq, frameShift),
      .end = findMaskEnd(seq, frameShift),
    };

    Range codonRange{
      .begin = nucRangeRel.begin / 3,
      .end = nucRangeRel.end / 3,
    };

    result.emplace_back(InternalFrameShiftResultWithMask{
      .frameShift = frameShift,
      .codonMask = codonRange,
    });
  }
  return result;
}


PeptidesInternal translateGenes(         //
  const NucleotideSequence& query,       //
  const NucleotideSequence& ref,         //
  const GeneMap& geneMap,                //
  const std::vector<int>& gapOpenCloseAA,//
  const NextalignOptions& options        //
) {

  NucleotideSequence newQueryMemory(ref.size(), Nucleotide::GAP);
  NucleotideSequenceSpan newQuery{newQueryMemory};

  NucleotideSequence newRefMemory(ref.size(), Nucleotide::GAP);
  NucleotideSequenceSpan newRef{newRefMemory};

  const auto coordMap = mapCoordinates(ref);
  const auto coordMapReverse = mapReverseCoordinates(ref);

  std::vector<PeptideInternal> queryPeptides;
  queryPeptides.reserve(geneMap.size());

  std::vector<PeptideInternal> refPeptides;
  refPeptides.reserve(geneMap.size());

  Warnings warnings;

  // For each gene in the requested subset
  for (const auto& [geneName, _] : geneMap) {
    const auto& found = geneMap.find(geneName);
    if (found == geneMap.end()) {
      const auto message = fmt::format(
        "When processing gene \"{:s}\": "
        "Gene \"{}\" was not found in the gene map. "
        "Note that this gene will not be included in the results "
        "of the sequence.",
        geneName, geneName);
      warnings.inGenes.push_back(GeneWarning{.geneName = geneName, .message = message});
      continue;
    }

    const auto& gene = found->second;

    // TODO: can be done once during initialization
    auto extractRefGeneStatus = extractGeneQuery(ref, gene, coordMap);
    if (extractRefGeneStatus.status != Status::Success) {
      const auto message = *extractRefGeneStatus.error;
      warnings.inGenes.push_back(GeneWarning{.geneName = geneName, .message = message});
      continue;
    }


    auto extractQueryGeneStatus = extractGeneQuery(query, gene, coordMap);
    if (extractQueryGeneStatus.status != Status::Success) {
      const auto message = *extractQueryGeneStatus.error;
      warnings.inGenes.push_back(GeneWarning{.geneName = geneName, .message = message});
      continue;
    }

    auto& refGeneSeq = *extractRefGeneStatus.result;
    auto& queryGeneSeq = *extractQueryGeneStatus.result;

    // Make sure subsequent gap stripping does not introduce frame shift
    protectFirstCodonInPlace(refGeneSeq);
    protectFirstCodonInPlace(queryGeneSeq);

    // NOTE: frame shift detection should be performed on unstripped genes
    const auto nucRelFrameShifts = detectFrameShifts(refGeneSeq, queryGeneSeq);
    const auto frameShiftResults = translateFrameShifts(nucRelFrameShifts, coordMap, coordMapReverse, gene);
    auto frameShiftResultsWithMask = findPeptideMask(queryGeneSeq, frameShiftResults, coordMap, coordMapReverse, gene);

    maskNucFrameShiftsInPlace(queryGeneSeq, frameShiftResults);

    // Strip all GAP characters to "forget" gaps introduced during alignment
    removeGapsInPlace(refGeneSeq);
    removeGapsInPlace(queryGeneSeq);

    auto refPeptide = translate(refGeneSeq, options.translatePastStop);
    const auto queryPeptide = translate(queryGeneSeq, options.translatePastStop);


    const auto geneAlignmentStatus =
      alignPairwise(queryPeptide, refPeptide, gapOpenCloseAA, options.alignment, options.seedAa);

    if (geneAlignmentStatus.status != Status::Success) {
      const auto message = fmt::format(
        "When processing gene \"{:s}\": {:>16s}. "
        "Note that this gene will not be included in the results "
        "of the sequence.",
        geneName, *geneAlignmentStatus.error);
      warnings.inGenes.push_back(GeneWarning{.geneName = geneName, .message = message});
      continue;
    }

    auto stripped = stripInsertions(geneAlignmentStatus.result->ref, geneAlignmentStatus.result->query);

    maskPeptideFrameShiftsInPlace(stripped.queryStripped, frameShiftResultsWithMask);

    queryPeptides.emplace_back(PeptideInternal{
      .name = geneName,                            //
      .seq = std::move(stripped.queryStripped),    //
      .insertions = std::move(stripped.insertions),//
      .frameShiftResults = frameShiftResults,
    });

    refPeptides.emplace_back(PeptideInternal{
      .name = geneName,            //
      .seq = std::move(refPeptide),//
      .insertions = {},            //
      .frameShiftResults = {},
    });
  }

  return PeptidesInternal{
    .queryPeptides = queryPeptides,//
    .refPeptides = refPeptides,    //
    .warnings = warnings,          //
  };
}
