#include "translateGenes.h"

#include <fmt/format.h>
#include <nextalign/nextalign.h>

#include <map>
#include <string>
#include <string_view>
#include <vector>

#include "../alphabet/nucleotides.h"
#include "../strip/stripInsertions.h"
#include "../utils/at.h"
#include "../utils/debug_trace.h"
#include "../utils/mapFind.h"
#include "./extractGene.h"
#include "./mapCoordinates.h"
#include "./translate.h"
#include "align/alignPairwise.h"
#include "detectFrameShifts.h"
#include "removeGaps.h"

namespace {
  template<typename T>
  inline T copy(const T& t) {
    return T(t);
  }
}// namespace

void maskNucFrameShiftsInPlace(NucleotideSequence& seq,
  const std::vector<InternalFrameShiftResultWithMask>& frameShifts) {
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


struct GapCounts {
  int leading;
  int internal;
  int trailing;
  int total;
};

/** Returns number of leading, internal and trailing gaps, as well as total count */
GapCounts countGaps(const NucleotideSequence& seq) {
  int len = safe_cast<int>(seq.size());

  if (len == 0) {
    return GapCounts{
      .leading = 0,
      .internal = 0,
      .trailing = 0,
      .total = 0,
    };
  }

  if (len == 1) {
    return GapCounts{
      .leading = isGap(seq[0]) ? 1 : 0,
      .internal = 0,
      .trailing = 0,
      .total = 0,
    };
  }

  // Rewind forward until the first non-gap
  int begin = 0;
  while (begin < len && isGap(seq[begin])) {
    ++begin;
  }


  // Rewind backwards starting from the end, until the first non-gap
  int end = len - 1;
  while (end >= 0 && isGap(seq[end])) {
    --end;
  }

  // Count gaps in the internal region
  int totalInternalGaps = 0;
  for (int i = begin; i < end; ++i) {
    if (isGap(seq[i])) {
      ++totalInternalGaps;
    }
  }

  int leading = begin;
  int internal = totalInternalGaps;
  int trailing = len - end;
  int total = leading + internal + trailing;

  return GapCounts{
    .leading = leading,
    .internal = internal,
    .trailing = trailing,
    .total = total,
  };
}

PeptidesInternal translateGenes(                               //
  const NucleotideSequence& query,                             //
  const NucleotideSequence& ref,                               //
  const std::map<std::string, RefPeptideInternal>& refPeptides,//
  const GeneMap& geneMap,                                      //
  const std::vector<int>& gapOpenCloseAA,                      //
  const NextalignOptions& options                              //
) {

  NucleotideSequence newQueryMemory(ref.size(), Nucleotide::GAP);
  NucleotideSequenceSpan newQuery{newQueryMemory};

  const CoordinateMapper coordMap{ref};

  std::vector<PeptideInternal> queryPeptides;
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

    // NOTE: `+ 3` here is a magic number to give some additional space
    const int bandWidth = safe_cast<int>(std::max(queryGapCounts.internal, refGapCounts.internal) / 3 + 3);
    const int shift = queryGapCounts.leading + bandWidth / 2;
    debug_trace("Deduced alignment params: bandWidth={:}, shift={:}\n", bandWidth, shift);

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


    debug_trace("Aligning peptide '{:}'\n", geneName);
    const auto geneAlignmentStatus = alignPairwise(queryPeptide, refPeptide->peptide, gapOpenCloseAA, options.alignment,
      options.seedAa, bandWidth, shift);

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
  }

  return PeptidesInternal{
    .queryPeptides = queryPeptides,//
    .warnings = warnings,          //
  };
}
