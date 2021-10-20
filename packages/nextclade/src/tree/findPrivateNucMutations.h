#pragma once

#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <map>
#include <vector>

namespace Nextclade {

  PrivateNucleotideMutations findPrivateNucMutations(//
    const std::map<int, Nucleotide>& nodeMutMap,     //
    const AnalysisResult& seq,                       //
    const NucleotideSequence& refSeq                 //
  );

  std::map<std::string, PrivateAminoacidMutations> findPrivateAaMutations(//
    const std::map<std::string, std::map<int, Aminoacid>>& nodeMutMap,    //
    const AnalysisResult& seq,                                            //
    const std::map<std::string, RefPeptideInternal>& refPeptides          //
  );

  class ErrorFindPrivateMutsRefPeptideNotFound : public ErrorNonFatal {
  public:
    explicit ErrorFindPrivateMutsRefPeptideNotFound(const std::string& name);
  };

}// namespace Nextclade
