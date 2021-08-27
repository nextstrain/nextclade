#include "getGapOpenCloseScores.h"

#include <fmt/format.h>
#include <nextalign/private/nextalign_private.h>

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
  std::vector<int> gapOpenClose(ref.size() + 2);
  std::fill(gapOpenClose.begin(), gapOpenClose.end(), options.alignment.penaltyGapOpen);
  return gapOpenClose;
}

std::vector<int> getGapOpenCloseScoresCodonAware(//
  /* in */ const NucleotideSequence& ref,        //
  /* in */ const GeneMap& geneMap,               //
  /* in */ const NextalignOptions& options       //
) {
  auto gapOpenClose = getGapOpenCloseScoresFlat(ref, options);

  for (const auto& [geneName, gene] : geneMap) {

    // TODO: might use std::fill()
    for (int i = gene.start; i < gene.end - 2; i += 3) {
      gapOpenClose[i] = options.alignment.penaltyGapOpenInFrame;
      gapOpenClose[i + 1] = options.alignment.penaltyGapOpenOutOfFrame;
      gapOpenClose[i + 2] = options.alignment.penaltyGapOpenOutOfFrame;
    }
  }

  return gapOpenClose;
}
