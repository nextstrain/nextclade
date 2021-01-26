#include "translateGenes.h"

#include <fmt/format.h>
#include <nextalign/nextalign.h>

#include <gsl/string_span>
#include <string>
#include <string_view>

#include "../alphabet/aminoacids.h"
#include "../alphabet/nucleotides.h"
#include "../strip/stripInsertions.h"
#include "./extractGene.h"
#include "./mapCoordinates.h"
#include "./translate.h"
#include "align/alignPairwise.h"
#include "utils/contains.h"
#include "utils/contract.h"


class ErrorGeneMapGeneNotFound : std::runtime_error {
  static std::string formatError(const std::string& geneName) {
    return fmt::format("Error: gene '{:s}' not found in gene map", geneName);
  }

public:
  explicit ErrorGeneMapGeneNotFound(const std::string& geneName) : std::runtime_error(formatError(geneName)) {}
};


PeptidesInternal translateGenes(         //
  const NucleotideSequence& query,       //
  const NucleotideSequence& ref,         //
  const GeneMap& geneMap,                //
  const std::vector<int>& gapOpenCloseAA,//
  const NextalignOptions& options        //
) {

  NucleotideSequence newQueryMemory(ref.size(), Nucleotide::GAP);
  NucleotideSequenceSpan newQuery{newQueryMemory};

  NucleotideSequence newRefMemory(ref.size(), Nucleotide::GAP);
  NucleotideSequenceSpan newRef{newRefMemory};

  const auto coordMap = mapCoordinates(ref);

  // Each position in the raw ref sequence should have a corresponding mapped position in aligned ref sequence
  invariant_equal(coordMap.size(), ref.size());


  std::vector<PeptideInternal> queryPeptides;
  queryPeptides.reserve(options.genes.size());

  std::vector<PeptideInternal> refPeptides;
  refPeptides.reserve(options.genes.size());

  std::vector<std::string> warnings;

  // For each gene in the requested subset
  for (const auto& geneName : options.genes) {
    try {

      const auto& found = geneMap.find(geneName);
      if (found == geneMap.end()) {
        throw ErrorGeneMapGeneNotFound(geneName);
      }

      const auto& gene = found->second;

      // TODO: can be done once during initialization
      const auto& refGene = extractGeneQuery(ref, gene, coordMap);
      const auto refPeptide = translate(refGene);

      const auto& queryGene = extractGeneQuery(query, gene, coordMap);
      const auto queryPeptide = translate(queryGene);

      const auto geneAlignment = alignPairwise(queryPeptide, refPeptide, gapOpenCloseAA, 10);
      const auto stripped = stripInsertions(geneAlignment.ref, geneAlignment.query);


      queryPeptides.emplace_back(PeptideInternal{
        .name = geneName,                           //
        .seq = std::move(stripped.queryStripped),   //
        .insertions = std::move(stripped.insertions)//
      });

      refPeptides.emplace_back(PeptideInternal{
        .name = geneName,                   //
        .seq = std::move(geneAlignment.ref),//
        .insertions = {}                    //
      });

    } catch (const std::exception& e) {
      // Error in one gene should not cause the failure of the entire translation step.
      // Gather and report as warnings instead.
      warnings.push_back(
        fmt::format("When processing gene \"{:s}\": {:>16s}. Note that this gene will not be included in the results "
                    "of the sequence",
          geneName, e.what()));
    }
  }

  return PeptidesInternal{
    .queryPeptides = queryPeptides,//
    .refPeptides = refPeptides,    //
    .warnings = warnings           //
  };
}
