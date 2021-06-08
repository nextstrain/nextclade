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

  std::vector<PeptideInternal> queryPeptides;
  queryPeptides.reserve(geneMap.size());

  std::vector<PeptideInternal> refPeptides;
  refPeptides.reserve(geneMap.size());

  std::vector<std::string> warnings;

  // For each gene in the requested subset
  for (const auto& [geneName, _] : geneMap) {
    const auto& found = geneMap.find(geneName);
    if (found == geneMap.end()) {
      warnings.push_back(
        fmt::format("When processing gene \"{:s}\": "
                    "Gene \"{}\" was not found in the gene map. "
                    "Note that this gene will not be included in the results "
                    "of the sequence.",
          geneName, geneName));
      continue;
    }

    const auto& gene = found->second;

    // TODO: can be done once during initialization
    const auto& extractRefGeneStatus = extractGeneQuery(ref, gene, coordMap);
    if (extractRefGeneStatus.status != Status::Success) {
      warnings.push_back(*extractRefGeneStatus.error);
    }


    const auto& extractQueryGeneStatus = extractGeneQuery(query, gene, coordMap);
    if (extractQueryGeneStatus.status != Status::Success) {
      warnings.push_back(*extractQueryGeneStatus.error);
    }

    auto refPeptide = translate(*extractRefGeneStatus.result);
    const auto queryPeptide = translate(*extractQueryGeneStatus.result);
    const auto geneAlignmentStatus =
      alignPairwise(queryPeptide, refPeptide, gapOpenCloseAA, options.alignment, options.seedAa);

    if (geneAlignmentStatus.status != Status::Success) {
      warnings.push_back(
        fmt::format("When processing gene \"{:s}\": {:>16s}. "
                    "Note that this gene will not be included in the results "
                    "of the sequence.",
          geneName, *geneAlignmentStatus.error));
      continue;
    }

    auto stripped = stripInsertions(geneAlignmentStatus.result->ref, geneAlignmentStatus.result->query);

    queryPeptides.emplace_back(PeptideInternal{
      .name = geneName,                           //
      .seq = std::move(stripped.queryStripped),   //
      .insertions = std::move(stripped.insertions)//
    });

    refPeptides.emplace_back(PeptideInternal{
      .name = geneName,            //
      .seq = std::move(refPeptide),//
      .insertions = {}             //
    });
  }

  return PeptidesInternal{
    .queryPeptides = queryPeptides,//
    .refPeptides = refPeptides,    //
    .warnings = warnings           //
  };
}
