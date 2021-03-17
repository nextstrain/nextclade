#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <numeric>
#include <vector>

#include "analyze/analyze.h"
#include "analyze/findNucleotideRanges.h"
#include "analyze/nucleotide.h"
#include "tree/Tree.h"
#include "tree/treeFindNearestNodes.h"
#include "tree/treePostprocess.h"
#include "tree/treePreprocess.h"
#include "utils/safe_cast.h"

namespace Nextclade {
  template<typename T>
  int calculateTotalLength(const std::vector<T>& items) {
    return std::accumulate(items.cbegin(), items.cend(), 0,//
      [](int result, const auto& item) { return result + item.length; });
  }

  class NextcladeAlgorithmImpl {
    NextcladeOptions options;
    Tree tree;

  public:
    explicit NextcladeAlgorithmImpl(const NextcladeOptions& options) : options(options), tree(options.treeString) {
      treePreprocess(tree, options.ref);
    }

    NextcladeResult run(const std::string& seqName, const NucleotideSequence& query) {
      const auto& ref = options.ref;
      const auto& pcrPrimers = options.pcrPrimers;
      const auto& geneMap = options.geneMap;

      const auto alignment = nextalignInternal(query, ref, geneMap, options.nextalignOptions);

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

      const auto treeFindNearestNodesResult = treeFindNearestNode(analysisResult, ref, tree);
      const auto& nearestNode = treeFindNearestNodesResult.nearestNode;
      const auto& privateMutations = treeFindNearestNodesResult.privateMutations;

      //  const { clade } = assignClade(analysisResult, match)
      //  const analysisResultWithClade = { ...analysisResult, clade }
      //
      //  const qc = runQC({ analysisResult: analysisResultWithClade, privateMutations, qcRulesConfig })
      //
      //  return { ...analysisResultWithClade, qc, nearestTreeNodeId: match.id }


      NextcladeResult result = {{
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
      }};

      return result;
    }

    const Tree& finalize() {
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

  const Tree& NextcladeAlgorithm::finalize() {
    return pimpl->finalize();
  }

  const char* getVersion() {
    return PROJECT_VERSION;
  }
}// namespace Nextclade
