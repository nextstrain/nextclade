#pragma once

#include <nextclade/nextclade.h>

#include <stdexcept>
#include <string>
#include <vector>

struct PeptideInternal;

namespace Nextclade {

  class ErrorGeneNotFound : public ErrorNonFatal {
  public:
    ErrorGeneNotFound(const std::string& geneName, const GeneMap& geneMap);
  };

  AminoacidChangesReport getAminoacidChanges(         //
    const NucleotideSequence& ref,                    //
    const NucleotideSequence& query,                  //
    const std::vector<PeptideInternal>& refPeptides,  //
    const std::vector<PeptideInternal>& queryPeptides,//
    const Range& alignmentRange,                      //
    const GeneMap& geneMap                            //
  );

}// namespace Nextclade
