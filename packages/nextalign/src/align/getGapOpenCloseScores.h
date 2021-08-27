#pragma once

#include <nextalign/nextalign.h>

std::vector<int> getGapOpenCloseScoresFlat(//
  /* in */ const NucleotideSequence& ref,  //
  /* in */ const NextalignOptions& options //
);

std::vector<int> getGapOpenCloseScoresCodonAware(//
  /* in */ const NucleotideSequence& ref,        //
  /* in */ const GeneMap& geneMap,               //
  /* in */ const NextalignOptions& options       //
);
