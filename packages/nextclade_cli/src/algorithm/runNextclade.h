#pragma once

#include <common/safe_vector.h>
#include <nextalign/nextalign.h>
#include <nextclade/nextclade.h>

#include <map>
#include <memory>
#include <ostream>
#include <string>


namespace Nextclade {
  class Logger;
  struct ReferenceSequenceData;

  /**
  * Runs nextclade algorithm in a parallel pipeline
  */
  void runNextclade(
    /* in  */ int parallelism,
    /* in  */ bool inOrder,
    /* inout */ std::unique_ptr<FastaStream> &inputFastaStream,
    /* in  */ const ReferenceSequenceData &refData,
    /* in  */ const QcConfig &qcRulesConfig,
    /* in  */ const VirusJson &virusJson,
    /* in  */ const std::string &treeString,
    /* in  */ const safe_vector<PcrPrimer> &pcrPrimers,
    /* in  */ const GeneMap &geneMap,
    /* in  */ const NextalignOptions &nextalignOptions,
    /* out */ std::unique_ptr<std::ostream> &outputJsonStream,
    /* out */ std::unique_ptr<std::ostream> &outputCsvStream,
    /* out */ std::unique_ptr<std::ostream> &outputTsvStream,
    /* out */ std::unique_ptr<std::ostream> &outputTreeStream,
    /* out */ std::ostream &outputFastaStream,
    /* out */ std::ostream &outputInsertionsStream,
    /* out */ std::ostream &outputErrorsFile,
    /* out */ std::map<std::string, std::ofstream> &outputGeneStreams,
    /* in */ bool shouldWriteReference,
    /* out */ Logger &logger);

}// namespace Nextclade
