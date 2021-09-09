#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <numeric>
#include <vector>

#include "analyze/calculateTotalLength.h"
#include "analyze/filterAminoacidChanges.h"
#include "analyze/findNucChanges.h"
#include "analyze/findNucleotideRanges.h"
#include "analyze/getAminoacidChanges.h"
#include "analyze/getFrameShifts.h"
#include "analyze/getNucleotideComposition.h"
#include "analyze/getPcrPrimerChanges.h"
#include "analyze/linkNucAndAaChangesInPlace.h"
#include "analyze/nucleotide.h"
#include "qc/runQc.h"
#include "tree/Tree.h"
#include "tree/treeAttachNodes.h"
#include "tree/treeFindNearestNodes.h"
#include "tree/treePostprocess.h"
#include "tree/treePreprocess.h"
#include "utils/safe_cast.h"

namespace Nextclade {
  NextcladeResult analyzeOneSequence(        //
    const std::string& seqName,              //
    const NucleotideSequence& ref,           //
    const NucleotideSequence& query,         //
    const GeneMap& geneMap,                  //
    const std::vector<PcrPrimer>& pcrPrimers,//
    const QcConfig& qcRulesConfig,           //
    const Tree& tree,                        //
    const NextalignOptions& nextalignOptions //
  ) {
    const auto alignment = nextalignInternal(query, ref, geneMap, nextalignOptions);

    auto nucChanges = findNucChanges(alignment.ref, alignment.query);
    const int totalSubstitutions = safe_cast<int>(nucChanges.substitutions.size());
    const int totalDeletions = calculateTotalLength(nucChanges.deletions);
    const int totalInsertions = calculateTotalLength(alignment.insertions);

    const auto missing = findNucleotideRanges(alignment.query, Nucleotide::N);
    const int totalMissing = calculateTotalLength(missing);

    const auto nonACGTNs = findNucleotideRanges(alignment.query, isNonAcgtnAndNonGap);
    const int totalNonACGTNs = calculateTotalLength(nonACGTNs);

    const auto nucleotideComposition = getNucleotideComposition(alignment.query);

    addPrimerChangesInPlace(nucChanges.substitutions, pcrPrimers);
    const auto pcrPrimerChanges = getPcrPrimerChanges(nucChanges.substitutions, pcrPrimers);
    const auto totalPcrPrimerChanges = std::accumulate(pcrPrimerChanges.cbegin(), pcrPrimerChanges.cend(), 0,
      [](int total, const auto& item) { return total + item.substitutions.size(); });

    auto aaChanges = getAminoacidChanges(                                       //
      alignment.ref,                                                            //
      alignment.query,                                                          //
      alignment.refPeptides,                                                    //
      alignment.queryPeptides,                                                  //
      Range{.begin = nucChanges.alignmentStart, .end = nucChanges.alignmentEnd},//
      geneMap                                                                   //
    );

    const auto& frameShifts = flattenFrameShifts(alignment.queryPeptides);
    const auto totalFrameShifts = safe_cast<int>(frameShifts.size());

    aaChanges = filterAminoacidChanges(aaChanges, frameShifts);

    linkNucAndAaChangesInPlace(nucChanges, aaChanges);

    const auto unknownAaRanges = findAminoacidRangesPerGene(alignment.queryPeptides, Aminoacid::X);
    const int totalUnknownAa = calculateTotalLength(unknownAaRanges);

    const auto totalAminoacidSubstitutions = safe_cast<int>(aaChanges.aaSubstitutions.size());
    const auto totalAminoacidDeletions = safe_cast<int>(aaChanges.aaDeletions.size());

    NextcladeResult result = {.ref = toString(alignment.ref),
      .query = toString(alignment.query),
      .refPeptides = toPeptidesExternal(alignment.refPeptides),
      .queryPeptides = toPeptidesExternal(alignment.queryPeptides),
      .warnings = alignment.warnings,

      .analysisResult = AnalysisResult{
        .seqName = seqName,

        .substitutions = nucChanges.substitutions,
        .totalSubstitutions = totalSubstitutions,
        .deletions = nucChanges.deletions,
        .totalDeletions = totalDeletions,
        .insertions = alignment.insertions,
        .totalInsertions = totalInsertions,
        .frameShifts = frameShifts,
        .totalFrameShifts = totalFrameShifts,
        .missing = missing,
        .totalMissing = totalMissing,
        .nonACGTNs = nonACGTNs,
        .totalNonACGTNs = totalNonACGTNs,

        .aaSubstitutions = aaChanges.aaSubstitutions,
        .totalAminoacidSubstitutions = totalAminoacidSubstitutions,
        .aaDeletions = aaChanges.aaDeletions,
        .totalAminoacidDeletions = totalAminoacidDeletions,

        .unknownAaRanges = unknownAaRanges,
        .totalUnknownAa = totalUnknownAa,

        .alignmentStart = nucChanges.alignmentStart,
        .alignmentEnd = nucChanges.alignmentEnd,
        .alignmentScore = alignment.alignmentScore,
        .nucleotideComposition = nucleotideComposition,
        .pcrPrimerChanges = pcrPrimerChanges,
        .totalPcrPrimerChanges = totalPcrPrimerChanges,

        // NOTE: these fields are not properly initialized here. They must be initialized below.
        .nearestNodeId = 0,
        .clade = "",
        .qc = {},
      }};

    const auto [nearestNodeId, nearestNodeClade, privateMutations] =
      treeFindNearestNode(result.analysisResult, ref, tree);
    result.analysisResult.nearestNodeId = nearestNodeId;
    result.analysisResult.clade = nearestNodeClade;

    result.analysisResult.qc = runQc(alignment, result.analysisResult, privateMutations, qcRulesConfig);

    return result;
  }

  class NextcladeAlgorithmImpl {
    const NextcladeOptions options;
    Tree tree;

  public:
    explicit NextcladeAlgorithmImpl(const NextcladeOptions& opt) : options(opt), tree(opt.treeString) {
      treePreprocess(tree, opt.ref);
    }

    NextcladeResult run(const std::string& seqName, const NucleotideSequence& query) {
      const auto& ref = options.ref;
      const auto& pcrPrimers = options.pcrPrimers;
      const auto& geneMap = options.geneMap;
      const auto& qcRulesConfig = options.qcRulesConfig;

      return analyzeOneSequence(//
        seqName,                //
        ref,                    //
        query,                  //
        geneMap,                //
        pcrPrimers,             //
        qcRulesConfig,          //
        tree,                   //
        options.nextalignOptions//
      );
    }

    const Tree& getTree() const {
      return tree;
    }

    const Tree& finalize(const std::vector<AnalysisResult>& results) {
      treeAttachNodes(tree, options.ref, results);
      treePostprocess(tree);
      return tree;
    }
  };

  NextcladeAlgorithm::NextcladeAlgorithm(const NextcladeOptions& options)
      : pimpl(std::make_unique<NextcladeAlgorithmImpl>(options)) {}

  NextcladeAlgorithm::~NextcladeAlgorithm() {}// NOLINT(modernize-use-equals-default)

  NextcladeResult NextcladeAlgorithm::run(const std::string& seqName, const NucleotideSequence& seq) {
    return pimpl->run(seqName, seq);
  }

  const Tree& NextcladeAlgorithm::getTree() const {
    return pimpl->getTree();
  }

  const Tree& NextcladeAlgorithm::finalize(const std::vector<AnalysisResult>& results) {
    return pimpl->finalize(results);
  }


  const char* getVersion() {
    return PROJECT_VERSION;
  }

  const char* getAnalysisResultsJsonSchemaVersion() {
    return "1.0.0";
  }

  const char* getQcConfigJsonSchemaVersion() {
    return "1.2.0";
  }

}// namespace Nextclade
