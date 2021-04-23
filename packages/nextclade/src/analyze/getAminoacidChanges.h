#pragma once

#include <nextclade/nextclade.h>

#include <stdexcept>
#include <string>
#include <vector>

struct PeptideInternal;

namespace Nextclade {

  class ErrorGeneNotFound : public std::runtime_error {
  public:
    ErrorGeneNotFound(const std::string& geneName, const GeneMap& geneMap);
  };

  struct GetAminoacidChangesResult {
    std::vector<AminoacidSubstitution> aaSubstitutions;
    std::vector<AminoacidDeletion> aaDeletions;
  };

  GetAminoacidChangesResult getAminoacidChanges(      //
    const NucleotideSequence& ref,                    //
    const NucleotideSequence& query,                  //
    const std::vector<PeptideInternal>& refPeptides,  //
    const std::vector<PeptideInternal>& queryPeptides,//
    const Range& alignmentRange,                      //
    const GeneMap& geneMap                            //
  );

}// namespace Nextclade
