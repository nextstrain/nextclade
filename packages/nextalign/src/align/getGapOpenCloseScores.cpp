#include "getGapOpenCloseScores.h"

#include <fmt/format.h>
#include <nextalign_private.h>

#include <vector>

class ErrorGeneMapGeneNotFound : std::runtime_error {
  static std::string formatError(const std::string& geneName) {
    return fmt::format("Error: gene '{:s}' not found in gene map", geneName);
  }

public:
  explicit ErrorGeneMapGeneNotFound(const std::string& geneName) : std::runtime_error(formatError(geneName)) {}
};

std::vector<int> getGapOpenCloseScoresFlat(//
  /* in */ const NucleotideSequence& ref,  //
  /* in */ const NextalignOptions& options //
) {
  std::vector<int> gapOpenClose(ref.size()+2);
  std::fill(gapOpenClose.begin(), gapOpenClose.end(), options.gapOpenOutOfFrame);
  return gapOpenClose;
}

std::vector<int> getGapOpenCloseScoresCodonAware(//
  /* in */ const NucleotideSequence& ref,        //
  /* in */ const GeneMap& geneMap,               //
  /* in */ const NextalignOptions& options       //
) {
  auto gapOpenClose = getGapOpenCloseScoresFlat(ref, options);

  for (const auto& geneName : options.genes) {
    // TODO: Should probably validate gene names before even running
    const auto& found = geneMap.find(geneName);
    if (found == geneMap.end()) {
      throw ErrorGeneMapGeneNotFound(geneName);
    }

    const auto& gene = found->second;

    // TODO: might use std::fill()
    for (int i = gene.start; i <= gene.end; i += 3) {
      gapOpenClose[i] = options.gapOpenInFrame;
    }
  }

  return gapOpenClose;
}
