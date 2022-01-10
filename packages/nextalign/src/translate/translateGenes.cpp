#include "translateGenes.h"

#include <common/copy.h>
#include <common/debug_trace.h>
#include <common/safe_vector.h>
#include <fmt/format.h>
#include <nextalign/nextalign.h>

#include <map>
#include <string>
#include <string_view>

#include "../alphabet/nucleotides.h"
#include "../strip/stripInsertions.h"
#include "../utils/at.h"
#include "../utils/mapFind.h"
#include "./extractGene.h"
#include "./mapCoordinates.h"
#include "./translate.h"
#include "align/alignPairwise.h"
#include "align/alignmentParams.h"
#include "decode.h"
#include "detectFrameShifts.h"
#include "removeGaps.h"


void maskNucFrameShiftsInPlace(NucleotideSequence& seq,
  const safe_vector<InternalFrameShiftResultWithMask>& frameShifts) {
  for (const auto& frameShift : frameShifts) {
    auto current = frameShift.frameShift.nucRel.begin;
    const auto end = frameShift.frameShift.nucRel.end;
    while (current < end) {
      if (at(seq, current) != Nucleotide::GAP) {
        at(seq, current) = Nucleotide::N;
      }
      ++current;
    }
  }
}


template<typename Letter>
void fillRangeInplace(Sequence<Letter>& seq, const Range& range, Letter letter) {
  auto current = range.begin;
  const auto end = range.end;
  while (current < end) {
    at(seq, current) = letter;
    ++current;
  }
}

/**
 * Mask gaps in frame shifted regions of the peptide.
 * This region is likely misaligned, so these gaps added during peptide alignment don't make sense.
 */
void maskPeptideFrameShiftsInPlace(AminoacidSequence& seq,
  const safe_vector<InternalFrameShiftResultWithMask>& frameShifts) {
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
safe_vector<FrameShiftResult> toExternal(const safe_vector<InternalFrameShiftResultWithMask>& frameShiftResults) {
  safe_vector<FrameShiftResult> result;
  result.reserve(frameShiftResults.size());
  for (const auto& fsr : frameShiftResults) {
    result.push_back(fsr.frameShift);
  }
  return result;
}

PeptidesInternal translateGenes(                               //
  const NucleotideSequence& query,                             //
  const NucleotideSequence& ref,                               //
  const std::map<std::string, RefPeptideInternal>& refPeptides,//
  const GeneMap& geneMap,                                      //
  const safe_vector<int>& gapOpenCloseAA,                      //
  const NextalignOptions& options                              //
) {

  NucleotideSequence newQueryMemory(ref.size(), Nucleotide::GAP);
  NucleotideSequenceSpan newQuery{newQueryMemory};

  const CoordinateMapper coordMap{ref};

  safe_vector<PeptideInternal> queryPeptides;
  queryPeptides.reserve(geneMap.size());

  Warnings warnings;

  // For each gene in the requested subset
  for (const auto& [geneName, gene] : geneMap) {
    const auto& refPeptide = mapFind(refPeptides, geneName);
    invariant(refPeptide.has_value());
    if (!refPeptide) {
      continue;
    }

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

    if (gene.strand == "-") {
      reverseComplementInPlace(*extractRefGeneStatus.result);
      reverseComplementInPlace(*extractQueryGeneStatus.result);
    }

    auto& refGeneSeq = *extractRefGeneStatus.result;
    const auto refGapCounts = countGaps(refGeneSeq);

    auto& queryGeneSeq = *extractQueryGeneStatus.result;
    const auto queryGeneSize = safe_cast<int>(queryGeneSeq.size());

    const auto queryGapCounts = countGaps(queryGeneSeq);
    const bool queryIsAllGaps = queryGapCounts.total >= queryGeneSize;

    // Handle the case when the query gene is completely missing
    if (queryGeneSeq.empty() || queryIsAllGaps) {
      const auto message = fmt::format(
        "When processing gene \"{:s}\": The gene consists entirely from gaps. "
        "Note that this gene will not be included in the results of the sequence.",
        geneName);
      warnings.inGenes.push_back(GeneWarning{.geneName = geneName, .message = message});
      continue;
    }

    // Make sure subsequent gap stripping does not introduce frame shift
    protectFirstCodonInPlace(refGeneSeq);
    protectFirstCodonInPlace(queryGeneSeq);

    // NOTE: frame shift detection should be performed on unstripped genes
    const auto nucRelFrameShifts = detectFrameShifts(refGeneSeq, queryGeneSeq);
    const auto frameShiftResults = translateFrameShifts(queryGeneSeq, nucRelFrameShifts, coordMap, gene);

    maskNucFrameShiftsInPlace(queryGeneSeq, frameShiftResults);

    // Strip all GAP characters to "forget" gaps introduced during alignment
    removeGapsInPlace(queryGeneSeq);

    debug_trace("Translating gene '{:}'\n", geneName);
    const auto queryPeptide = translate(queryGeneSeq, options.translatePastStop);

    // Bail out if the peptide is empty
    if (queryPeptide.empty()) {
      const auto message = fmt::format(
        "When processing gene \"{:s}\". Translated peptide is empty. "
        "Note that this gene will not be included in the results of the sequence.",
        geneName);
      warnings.inGenes.push_back(GeneWarning{.geneName = geneName, .message = message});
      continue;
    }

    debug_trace("Aligning peptide '{:}'\n", geneName);
    const AlignmentParams alignmentParams = calculateAaAlignmentParams(queryGapCounts, refGapCounts);
    const auto geneAlignmentStatus = alignPairwise(queryPeptide, refPeptide->peptide, gapOpenCloseAA, options.alignment,
      alignmentParams.bandWidth, alignmentParams.shift);

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

    safe_vector<FrameShiftResult> frameShiftResultsFinal = toExternal(frameShiftResults);

    queryPeptides.emplace_back(PeptideInternal{
      .name = geneName,                                      //
      .seq = std::move(stripped.queryStripped),              //
      .insertions = std::move(stripped.insertions),          //
      .frameShiftResults = std::move(frameShiftResultsFinal),//
    });
  }

  return PeptidesInternal{
    .queryPeptides = queryPeptides,//
    .warnings = warnings,          //
  };
}
