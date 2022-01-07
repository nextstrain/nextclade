#include <common/debug_trace.h>
#include <nextalign/private/nextalign_private.h>
#include <utils/concat_move.h>

#include <algorithm>

#include "align/alignPairwise.h"
#include "align/getGapOpenCloseScores.h"
#include "strip/stripInsertions.h"
#include "translate/removeGaps.h"
#include "translate/translateGenes.h"
#include "utils/map.h"

Insertion toInsertionExternal(const InsertionInternal<Nucleotide>& ins) {
  return Insertion{.pos = ins.pos, .length = ins.length, .ins = toString(ins.ins)};
}

safe_vector<Insertion> toInsertionsExternal(const safe_vector<InsertionInternal<Nucleotide>>& insertions) {
  return map(insertions, std::function<Insertion(InsertionInternal<Nucleotide>)>(toInsertionExternal));
}

Peptide toPeptideExternal(const PeptideInternal& peptide) {
  return Peptide{.name = peptide.name, .seq = toString(peptide.seq), .frameShiftResults = peptide.frameShiftResults};
}

safe_vector<Peptide> toPeptidesExternal(const safe_vector<PeptideInternal>& peptides) {
  return map(peptides, std::function<Peptide(PeptideInternal)>(toPeptideExternal));
}

RefPeptide toRefPeptideExternal(const RefPeptideInternal& peptide) {
  return RefPeptide{.name = peptide.geneName, .seq = toString(peptide.peptide)};
}

std::string formatInsertion(const NucleotideInsertion& insertion) {
  // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
  const auto positionOneBased = insertion.pos + 1;
  const auto insertedSequence = toString(insertion.ins);
  return fmt::format("{}:{}", positionOneBased, insertedSequence);
}

std::string formatInsertions(const safe_vector<NucleotideInsertion>& insertions) {
  return formatAndJoin(insertions, formatInsertion, ";");
}


safe_vector<RefPeptide> toRefPeptidesExternal(const safe_vector<RefPeptideInternal>& peptides) {
  return map(peptides, std::function<RefPeptide(RefPeptideInternal)>(toRefPeptideExternal));
}

NextalignResultInternal nextalignInternal(const NucleotideSequence& query, const NucleotideSequence& ref,
  const std::map<std::string, RefPeptideInternal>& refPeptides, const GeneMap& geneMap,
  const NextalignOptions& options) {

  // TODO: hoist this out of the loop
  const auto gapOpenCloseNuc = getGapOpenCloseScoresCodonAware(ref, geneMap, options);
  const auto gapOpenCloseAA = getGapOpenCloseScoresFlat(ref, options);

  debug_trace("Aligning nucleotide sequence\n", "");
  const auto alignmentStatus = alignPairwise(query, ref, gapOpenCloseNuc, options.alignment, options.seedNuc);
  if (alignmentStatus.status != Status::Success) {
    throw ErrorNonFatal(*alignmentStatus.error);
  }

  const auto stripped = stripInsertions(alignmentStatus.result->ref, alignmentStatus.result->query);
  const auto refStripped = removeGaps(ref);

  safe_vector<PeptideInternal> queryPeptides;
  Warnings warnings;
  if (!geneMap.empty()) {
    auto peptidesInternal = translateGenes(alignmentStatus.result->query, alignmentStatus.result->ref, refPeptides,
      geneMap, gapOpenCloseAA, options);
    concat_move(peptidesInternal.queryPeptides, queryPeptides);
    concat_move(peptidesInternal.warnings.global, warnings.global);
    concat_move(peptidesInternal.warnings.inGenes, warnings.inGenes);
  }

  return NextalignResultInternal{
    .query = stripped.queryStripped,
    .ref = refStripped,
    .alignmentScore = alignmentStatus.result->alignmentScore,
    .queryPeptides = queryPeptides,
    .insertions = stripped.insertions,
    .warnings = warnings,
  };
}

const char* getVersion() {
  return PROJECT_VERSION;
}
