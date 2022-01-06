#pragma once

#include <nextalign/nextalign.h>

safe_vector<int> getGapOpenCloseScoresFlat(//
  /* in */ const NucleotideSequence& ref,  //
  /* in */ const NextalignOptions& options //
);

safe_vector<int> getGapOpenCloseScoresCodonAware(//
  /* in */ const NucleotideSequence& ref,        //
  /* in */ const GeneMap& geneMap,               //
  /* in */ const NextalignOptions& options       //
);
