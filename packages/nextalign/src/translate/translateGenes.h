#pragma once

#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>

#include <map>
#include <common/safe_vector.h>

PeptidesInternal translateGenes(                               //
  const NucleotideSequence& query,                             //
  const NucleotideSequence& ref,                               //
  const std::map<std::string, RefPeptideInternal>& refPeptides,//
  const GeneMap& geneMap,                                      //
  const safe_vector<int>& gapOpenCloseAA,                      //
  const NextalignOptions& options                              //
);
