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
  return Insertion{.begin = ins.begin, .end = ins.end, .seq = toString(ins.seq)};
}

Peptide toPeptideExternal(const PeptideInternal& peptide) {
  return Peptide{.name = peptide.name, .seq = toString(peptide.seq)};
}


NextalignResultInternal nextalignInternal(const NucleotideSequence& query, const NucleotideSequence& ref,
  const GeneMap& geneMap, const NextalignOptions& options) {

  // TODO: hoist this out of the loop
  const auto gapOpenCloseNuc = getGapOpenCloseScoresCodonAware(ref, geneMap, options);
  const auto gapOpenCloseAA = getGapOpenCloseScoresFlat(ref, options);

  const auto alignment = alignPairwise(query, ref, gapOpenCloseNuc, options.alignment, options.seedNuc);

  std::vector<PeptideInternal> queryPeptides;
  std::vector<PeptideInternal> refPeptides;
  std::vector<std::string> warnings;
  if (!geneMap.empty()) {
    try {
      auto peptidesInternal = translateGenes(alignment.query, alignment.ref, geneMap, gapOpenCloseAA, options);
      concat_move(peptidesInternal.queryPeptides, queryPeptides);
      concat_move(peptidesInternal.refPeptides, refPeptides);
      concat_move(peptidesInternal.warnings, warnings);
    } catch (const std::exception& e) {
      // Errors in translation should not cause sequence alignment failure.
      // Gather and report as warnings instead.
      warnings.push_back(e.what());
    }
  }

  const auto stripped = stripInsertions(alignment.ref, alignment.query);
  const auto refStripped = removeGaps(ref);

  NextalignResultInternal result;
  result.ref = toString(refStripped);
  result.query = stripped.queryStripped;
  result.ref = alignment.ref;
  result.alignmentScore = alignment.alignmentScore;
  result.refPeptides = refPeptides;
  result.queryPeptides = queryPeptides;
  result.insertions = stripped.insertions;
  result.warnings = warnings;

  return result;
}

NextalignResult nextalign(const NucleotideSequence& query, const NucleotideSequence& ref, const GeneMap& geneMap,
  const NextalignOptions& options) {
  const auto resultInternal = nextalignInternal(query, ref, geneMap, options);

  NextalignResult result;
  result.query = toString(resultInternal.query);
  result.alignmentScore = resultInternal.alignmentScore;
  result.refPeptides = map(resultInternal.refPeptides, std::function<Peptide(PeptideInternal)>(toPeptideExternal));
  result.queryPeptides = map(resultInternal.queryPeptides, std::function<Peptide(PeptideInternal)>(toPeptideExternal));
  result.insertions =
    map(resultInternal.insertions, std::function<Insertion(InsertionInternal<Nucleotide>)>(toInsertionExternal));
  result.warnings = resultInternal.warnings;

  return result;
}


const char* getVersion() {
  return PROJECT_VERSION;
}
