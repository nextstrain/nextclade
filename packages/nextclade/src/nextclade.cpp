#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <numeric>
#include <vector>

#include "analyze/analyze.h"
#include "analyze/findNucleotideRanges.h"
#include "analyze/nucleotide.h"
#include "tree/treeFindNearestNodes.h"
#include "utils/safe_cast.h"

namespace Nextclade {


  template<typename T>
  int calculateTotalLength(const std::vector<T>& items) {
    return std::accumulate(items.cbegin(), items.cend(), 0,//
      [](int result, const auto& item) { return result + item.length; });
  }


  NextcladeResult nextclade(const NextcladeParams& params) {
    const auto& seqName = params.seqName;
    const auto& query = params.query;
    const auto& ref = params.ref;
    const auto& pcrPrimers = params.pcrPrimers;
    const auto& geneMap = params.geneMap;
    const auto& auspiceData = params.auspiceData;
    const auto& options = params.options;

    const auto alignment = nextalignInternal(query, ref, geneMap, options);

    const auto analysis = analyze(alignment.query, alignment.ref);
    const int totalSubstitutions = safe_cast<int>(analysis.substitutions.size());
    const int totalDeletions = calculateTotalLength(analysis.deletions);
    const int totalInsertions = calculateTotalLength(analysis.insertions);

    const auto missing = findNucleotideRanges(alignment.query, Nucleotide::N);
    const int totalMissing = calculateTotalLength(missing);

    const auto nonACGTNs = findNucleotideRanges(alignment.query, isNonAcgtnAndNonGap);
    const int totalNonACGTNs = calculateTotalLength(nonACGTNs);


    const NextcladeResultIntermediate analysisResult = {
      .seqName = seqName,
      .substitutions = analysis.substitutions,
      .totalSubstitutions = totalSubstitutions,
      .deletions = analysis.deletions,
      .totalDeletions = totalDeletions,
      .insertions = analysis.insertions,
      .totalInsertions = totalInsertions,
      .missing = missing,
      .totalMissing = totalMissing,
      .nonACGTNs = nonACGTNs,
      .totalNonACGTNs = totalNonACGTNs,
      .alignmentStart = analysis.alignmentStart,
      .alignmentEnd = analysis.alignmentEnd,
      .alignmentScore = alignment.alignmentScore,
    };

    const auto treeFindNearestNodesResult = treeFindNearestNodes(analysisResult, ref, auspiceData);
    //  const { clade } = assignClade(analysisResult, match)
    //  const analysisResultWithClade = { ...analysisResult, clade }
    //
    //  const qc = runQC({ analysisResult: analysisResultWithClade, privateMutations, qcRulesConfig })
    //
    //  return { ...analysisResultWithClade, qc, nearestTreeNodeId: match.id }
  }
}// namespace Nextclade
