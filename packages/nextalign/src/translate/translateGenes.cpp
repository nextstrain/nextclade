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


void maskNucFrameShiftsInPlace(NucleotideSequence& seq,
  const std::vector<InternalFrameShiftResultWithMask>& frameShifts) {
  for (const auto& frameShift : frameShifts) {
    auto current = frameShift.frameShift.nucRel.begin;
    const auto end = frameShift.frameShift.nucRel.end;
    while (current < end) {
      invariant_greater(current, 0);
      invariant_less_equal(current, seq.size());
      if (seq[current] != Nucleotide::GAP) {
        seq[current] = Nucleotide::N;
      }
      ++current;
    }
  }
}


template<typename Letter>
void fillRangeInplace(Sequence<Letter>& seq, const Range& range, Letter letter) {
  auto current = range.begin;
  const auto end = range.end;
  invariant_greater(current, 0);
  invariant_less_equal(end, seq.size());
  while (current < end) {
    seq[current] = letter;
    ++current;
  }
}

/**
 * Mask gaps in frame shifted regions of the peptide.
 * This region is likely misaligned, so these gaps added during peptide alignment don't make sense.
 */
void maskPeptideFrameShiftsInPlace(AminoacidSequence& seq,
  const std::vector<InternalFrameShiftResultWithMask>& frameShifts) {
  for (const auto& frameShift : frameShifts) {
    const auto& gapsLeading = frameShift.frameShift.gapsLeading.codon;
    const auto& frameShiftBody = frameShift.frameShift.codon;
    const auto& gapsTrailing = frameShift.frameShift.gapsTrailing.codon;

    fillRangeInplace(seq, gapsLeading, Aminoacid::GAP);
    fillRangeInplace(seq, frameShiftBody, Aminoacid::X);
    fillRangeInplace(seq, gapsTrailing, Aminoacid::GAP);
  }
}

/** Converts frame shift internal representation to external representation  */
std::vector<FrameShiftResult> toExternal(const std::vector<InternalFrameShiftResultWithMask>& frameShiftResults) {
  std::vector<FrameShiftResult> result;
  result.reserve(frameShiftResults.size());
  for (const auto& fsr : frameShiftResults) {
    result.push_back(fsr.frameShift);
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

  const CoordinateMapper coordMap{ref};

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
    const auto frameShiftResults =
      translateFrameShifts(query, nucRelFrameShifts, coordMap, gene);

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

    maskPeptideFrameShiftsInPlace(stripped.queryStripped, frameShiftResults);

    std::vector<FrameShiftResult> frameShiftResultsFinal = toExternal(frameShiftResults);

    queryPeptides.emplace_back(PeptideInternal{
      .name = geneName,                                      //
      .seq = std::move(stripped.queryStripped),              //
      .insertions = std::move(stripped.insertions),          //
      .frameShiftResults = std::move(frameShiftResultsFinal),//
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
