#include <common/safe_vector.h>
#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <numeric>

#include "analyze/calculateTotalLength.h"
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
#include "tree/calculateDivergence.h"
#include "tree/findPrivateMutations.h"
#include "tree/treeAttachNodes.h"
#include "tree/treeFindNearestNodes.h"
#include "tree/treePostprocess.h"
#include "tree/treePreprocess.h"
#include "utils/safe_cast.h"

namespace Nextclade {
  safe_vector<AminoacidInsertion> convertAaInsertions(const safe_vector<PeptideInternal>& peptides) {
    safe_vector<AminoacidInsertion> result;
    for (const auto& peptide : peptides) {
      for (const auto& insertion : peptide.insertions) {
        result.emplace_back(AminoacidInsertion{
          .gene = peptide.name,
          .pos = insertion.pos,
          .length = insertion.length,
          .ins = insertion.ins,
        });
      }
    }
    return result;
  }

  NextcladeResult analyzeOneSequence(                            //
    const std::string& seqName,                                  //
    const NucleotideSequence& ref,                               //
    const NucleotideSequence& query,                             //
    const std::map<std::string, RefPeptideInternal>& refPeptides,//
    const safe_vector<RefPeptideInternal>& refPeptidesArr,       //
    const GeneMap& geneMap,                                      //
    const safe_vector<PcrPrimer>& pcrPrimers,                    //
    const QcConfig& qcRulesConfig,                               //
    const Tree& tree,                                            //
    const NextalignOptions& nextalignOptions,                    //
    const safe_vector<std::string>& customNodeAttrKeys           //
  ) {
    const auto alignment = nextalignInternal(query, ref, refPeptides, geneMap, nextalignOptions);

    std::set<std::string> missingGenes;
    for (const auto& geneWarning : alignment.warnings.inGenes) {
      missingGenes.emplace(geneWarning.geneName);
    }

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
      refPeptides,                                                              //
      alignment.queryPeptides,                                                  //
      Range{.begin = nucChanges.alignmentStart, .end = nucChanges.alignmentEnd},//
      geneMap                                                                   //
    );

    const auto& frameShifts = flattenFrameShifts(alignment.queryPeptides);
    const auto totalFrameShifts = safe_cast<int>(frameShifts.size());

    linkNucAndAaChangesInPlace(nucChanges, aaChanges);

    const auto unknownAaRanges = findAminoacidRangesPerGene(alignment.queryPeptides, Aminoacid::X);
    const int totalUnknownAa = calculateTotalLength(unknownAaRanges);

    const auto totalAminoacidSubstitutions = safe_cast<int>(aaChanges.aaSubstitutions.size());
    const auto totalAminoacidDeletions = safe_cast<int>(aaChanges.aaDeletions.size());

    safe_vector<AminoacidInsertion> aaInsertions = convertAaInsertions(alignment.queryPeptides);
    auto totalAaInsertions = safe_cast<int>(aaInsertions.size());

    auto analysisResult = AnalysisResult{
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
      .aaInsertions = aaInsertions,
      .totalAminoacidInsertions = totalAaInsertions,

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
      .privateNucMutations = {},
      .privateAaMutations = {},
      .missingGenes = missingGenes,
      .divergence = 0.0,
      .qc = {},
      .customNodeAttributes = {},
    };


    const auto& nearestNode = treeFindNearestNode(tree, analysisResult);
    analysisResult.nearestNodeId = nearestNode.id();
    analysisResult.clade = nearestNode.clade();

    analysisResult.customNodeAttributes = nearestNode.customNodeAttributes(customNodeAttrKeys);
    analysisResult.privateNucMutations = findPrivateNucMutations(nearestNode.mutations(), analysisResult, ref);

    analysisResult.privateAaMutations =
      findPrivateAaMutations(nearestNode.aaMutations(), analysisResult, refPeptides, geneMap);

    analysisResult.divergence =
      calculateDivergence(nearestNode, analysisResult, tree.tmpDivergenceUnits(), safe_cast<int>(ref.size()));

    analysisResult.qc = runQc(alignment, analysisResult, qcRulesConfig);

    return NextcladeResult{
      .ref = toString(alignment.ref),
      .query = toString(alignment.query),
      .refPeptides = toRefPeptidesExternal(refPeptidesArr),
      .queryPeptides = toPeptidesExternal(alignment.queryPeptides),
      .warnings = alignment.warnings,
      .analysisResult = std::move(analysisResult),
    };
  }


  safe_vector<RefPeptideInternal> getRefPeptidesArray(const std::map<std::string, RefPeptideInternal>& refPeptides) {
    safe_vector<RefPeptideInternal> result;
    result.reserve(refPeptides.size());
    for (const auto& refPeptide : refPeptides) {
      result.emplace_back(refPeptide.second);
    }
    return result;
  }

  class NextcladeAlgorithmImpl {
    const NextcladeOptions options;
    Tree tree;
    std::map<std::string, RefPeptideInternal> refPeptides;

    // FIXME: this contains duplicate content of `refPeptides`. Deduplicate and change the downstream code to use `refPeptides` if possible please.
    safe_vector<RefPeptideInternal> refPeptidesArr;

  public:
    explicit NextcladeAlgorithmImpl(const NextcladeOptions& opt)
        : options(opt),
          tree(opt.treeString),
          refPeptides(translateGenesRef(opt.ref, opt.geneMap, opt.nextalignOptions)),
          refPeptidesArr(getRefPeptidesArray(refPeptides)) {
      treePreprocess(tree, opt.ref, refPeptides);
    }

    safe_vector<std::string> getCladeNodeAttrKeys() const {
      return tree.getCladeNodeAttrKeys();
    }

    NextcladeResult run(const std::string& seqName, const NucleotideSequence& query) {
      const auto& ref = options.ref;
      const auto& pcrPrimers = options.pcrPrimers;
      const auto& geneMap = options.geneMap;
      const auto& qcRulesConfig = options.qcRulesConfig;

      return analyzeOneSequence(   //
        seqName,                   //
        ref,                       //
        query,                     //
        refPeptides,               //
        refPeptidesArr,            //
        geneMap,                   //
        pcrPrimers,                //
        qcRulesConfig,             //
        tree,                      //
        options.nextalignOptions,  //
        tree.getCladeNodeAttrKeys()//
      );
    }

    const Tree& getTree() const {
      return tree;
    }

    const Tree& finalize(const safe_vector<AnalysisResult>& results) {
      treeAttachNodes(tree, results);
      treePostprocess(tree);
      return tree;
    }
  };

  NextcladeAlgorithm::NextcladeAlgorithm(const NextcladeOptions& options)
      : pimpl(std::make_unique<NextcladeAlgorithmImpl>(options)) {}

  NextcladeAlgorithm::~NextcladeAlgorithm() {}// NOLINT(modernize-use-equals-default)

  safe_vector<std::string> NextcladeAlgorithm::getCladeNodeAttrKeys() const {
    return pimpl->getCladeNodeAttrKeys();
  }

  NextcladeResult NextcladeAlgorithm::run(const std::string& seqName, const NucleotideSequence& seq) {
    return pimpl->run(seqName, seq);
  }

  const Tree& NextcladeAlgorithm::getTree() const {
    return pimpl->getTree();
  }

  const Tree& NextcladeAlgorithm::finalize(const safe_vector<AnalysisResult>& results) {
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
