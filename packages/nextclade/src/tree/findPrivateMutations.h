#pragma once

#include <common/safe_vector.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <map>

namespace Nextclade {

  PrivateNucleotideMutations findPrivateNucMutations(                    //
    const std::map<int, Nucleotide>& nodeMutMap,                         //
    const AnalysisResult& seq,                                           //
    const NucleotideSequence& refSeq,                                    //
    const safe_vector<GenotypeLabeled<Nucleotide>>& substitutionLabelMap,//
    const safe_vector<GenotypeLabeled<Nucleotide>>& deletionLabelMap     //
  );

  std::map<std::string, PrivateAminoacidMutations> findPrivateAaMutations(//
    const std::map<std::string, std::map<int, Aminoacid>>& nodeMutMap,    //
    const AnalysisResult& seq,                                            //
    const std::map<std::string, RefPeptideInternal>& refPeptides,         //
    const GeneMap& geneMap,                                               //
    const safe_vector<GenotypeLabeled<Aminoacid>>& substitutionLabelMap,  //
    const safe_vector<GenotypeLabeled<Aminoacid>>& deletionLabelMap       //
  );

  class ErrorFindPrivateMutsRefPeptideNotFound : public ErrorNonFatal {
  public:
    explicit ErrorFindPrivateMutsRefPeptideNotFound(const std::string& name);
  };

}// namespace Nextclade
