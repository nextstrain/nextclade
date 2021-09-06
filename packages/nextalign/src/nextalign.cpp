#include <fmt/format.h>
#include <nextalign/nextalign.h>
#include <utils/concat_move.h>

#include <string>

#include "align/alignPairwise.h"
#include "align/getGapOpenCloseScores.h"
#include "alphabet/nucleotides.h"
#include "strip/stripInsertions.h"
#include "translate/removeGaps.h"
#include "translate/translateGenes.h"
#include "utils/contract.h"
#include "utils/map.h"
#include "utils/safe_cast.h"

Insertion toInsertionExternal(const InsertionInternal<Nucleotide>& ins) {
  return Insertion{.pos = ins.pos, .length = ins.length, .ins = toString(ins.ins)};
}

std::vector<Insertion> toInsertionsExternal(const std::vector<InsertionInternal<Nucleotide>>& insertions) {
  return map(insertions, std::function<Insertion(InsertionInternal<Nucleotide>)>(toInsertionExternal));
}

Peptide toPeptideExternal(const PeptideInternal& peptide) {
  return Peptide{.name = peptide.name, .seq = toString(peptide.seq), .frameShiftRanges = peptide.frameShiftRanges};
}

std::vector<Peptide> toPeptidesExternal(const std::vector<PeptideInternal>& peptides) {
  return map(peptides, std::function<Peptide(PeptideInternal)>(toPeptideExternal));
}


NextalignResultInternal nextalignInternal(const NucleotideSequence& query, const NucleotideSequence& ref,
  const GeneMap& geneMap, const NextalignOptions& options) {

  // TODO: hoist this out of the loop
  const auto gapOpenCloseNuc = getGapOpenCloseScoresCodonAware(ref, geneMap, options);
  const auto gapOpenCloseAA = getGapOpenCloseScoresFlat(ref, options);

  const auto alignmentStatus = alignPairwise(query, ref, gapOpenCloseNuc, options.alignment, options.seedNuc);
  if (alignmentStatus.status != Status::Success) {
    throw ErrorNonFatal(*alignmentStatus.error);
  }

  std::vector<PeptideInternal> queryPeptides;
  std::vector<PeptideInternal> refPeptides;
  std::vector<FrameShift> frameShifts;
  Warnings warnings;
  if (!geneMap.empty()) {
    auto peptidesInternal =
      translateGenes(alignmentStatus.result->query, alignmentStatus.result->ref, geneMap, gapOpenCloseAA, options);
    concat_move(peptidesInternal.queryPeptides, queryPeptides);
    concat_move(peptidesInternal.refPeptides, refPeptides);
    concat_move(peptidesInternal.warnings.global, warnings.global);
    concat_move(peptidesInternal.warnings.inGenes, warnings.inGenes);
    concat_move(peptidesInternal.frameShifts, frameShifts);
  }

  const auto stripped = stripInsertions(alignmentStatus.result->ref, alignmentStatus.result->query);
  const auto refStripped = removeGaps(ref);

  return NextalignResultInternal{
    .query = stripped.queryStripped,
    .ref = refStripped,
    .alignmentScore = alignmentStatus.result->alignmentScore,
    .refPeptides = refPeptides,
    .queryPeptides = queryPeptides,
    .insertions = stripped.insertions,
    .warnings = warnings,
    .frameShifts = frameShifts,
  };
}

NextalignResult nextalign(const NucleotideSequence& query, const NucleotideSequence& ref, const GeneMap& geneMap,
  const NextalignOptions& options) {
  const auto resultInternal = nextalignInternal(query, ref, geneMap, options);

  return NextalignResult{
    .ref = toString(resultInternal.ref),
    .query = toString(resultInternal.query),
    .alignmentScore = resultInternal.alignmentScore,
    .refPeptides = toPeptidesExternal(resultInternal.refPeptides),
    .queryPeptides = toPeptidesExternal(resultInternal.queryPeptides),
    .insertions = toInsertionsExternal(resultInternal.insertions),
    .warnings = resultInternal.warnings,
  };
}


const char* getVersion() {
  return PROJECT_VERSION;
}
