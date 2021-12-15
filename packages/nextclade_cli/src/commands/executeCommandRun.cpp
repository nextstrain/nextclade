#include <fmt/format.h>
#include <nextclade_common/openOutputFile.h>
#include <tbb/global_control.h>

#include <map>
#include <optional>
#include <set>
#include <string>
#include <thread>

#include "../algorithm/runNextclade.h"
#include "../generated/cli.h"
#include "../io/format.h"
#include "../io/getInputPaths.h"
#include "../io/getNextalignOptions.h"
#include "../io/getOutputPaths.h"
#include "../io/parseGeneMapGffFile.h"
#include "../io/parseRefFastaFile.h"
#include "../io/readFile.h"
#include "./commands.h"

namespace Nextclade {
  class ErrorCliOptionInvalidValue : public ErrorFatal {
  public:
    inline explicit ErrorCliOptionInvalidValue(const std::string& message) : ErrorFatal(message) {}
  };

  void executeCommandRun(const std::shared_ptr<CliParamsRun>& cliParams) {
    Logger logger{Logger::Options{
      .linePrefix = "Nextclade",
      .verbosity = Logger::convertVerbosity(cliParams->verbosity),
      .verbose = cliParams->verbose,
      .silent = cliParams->silent,
    }};

    try {
      const InputPaths inputPaths = getInputPaths(cliParams, logger);
      logger.info(formatInputPaths(inputPaths));

      const auto& inputFasta = inputPaths.inputFasta;
      const auto& inputRootSeq = inputPaths.inputRootSeq;
      const auto& inputGeneMap = inputPaths.inputGeneMap;
      const auto& inputQcConfig = inputPaths.inputQcConfig;
      const auto& inputTree = inputPaths.inputTree;
      const auto& inputPcrPrimers = inputPaths.inputPcrPrimers;

      const auto refData = parseRefFastaFile(inputRootSeq);
      const auto shouldWriteReference = cliParams->includeReference;
      logger.info(formatRef(refData, shouldWriteReference));

      if (!cliParams->genes.empty() && !inputGeneMap) {
        throw ErrorCliOptionInvalidValue("Parameter `--genes` requires parameter `--input-gene-map` to be specified.");
      }

      GeneMap geneMap;
      std::set<std::string> genes;
      if (inputGeneMap) {
        geneMap = parseGeneMapGffFile(*inputGeneMap);

        if (cliParams->genes.empty()) {
          // If `--genes` are omitted or empty, use all genes in the gene map
          std::transform(geneMap.cbegin(), geneMap.cend(), std::inserter(genes, genes.end()),
            [](const auto& it) { return it.first; });
        } else {
          genes = parseGenes(cliParams->genes);
        }

        validateGenes(genes, geneMap);

        const GeneMap geneMapFull = geneMap;
        geneMap = filterGeneMap(genes, geneMap);
        logger.info(formatGeneMap(geneMapFull, genes));
      }

      if (!genes.empty()) {
        // penaltyGapOpenOutOfFrame > penaltyGapOpenInFrame > penaltyGapOpen
        const auto isInFrameGreater = cliParams->penaltyGapOpenInFrame > cliParams->penaltyGapOpen;
        const auto isOutOfFrameEvenGreater = cliParams->penaltyGapOpenOutOfFrame > cliParams->penaltyGapOpenInFrame;
        if (!(isInFrameGreater && isOutOfFrameEvenGreater)) {
          throw ErrorCliOptionInvalidValue(fmt::format(
            "Should verify the condition `--penalty-gap-open-out-of-frame` > `--penalty-gap-open-in-frame` > "
            "`--penalty-gap-open`, but got {:d} > {:d} > {:d}, which is false",
            cliParams->penaltyGapOpenOutOfFrame, cliParams->penaltyGapOpenInFrame, cliParams->penaltyGapOpen));
        }
      }

      auto inputFastaStream = makeFastaStream(inputFasta);

      const auto qcJsonString = readFile(inputQcConfig);
      const auto qcRulesConfig = Nextclade::parseQcConfig(qcJsonString);
      if (!Nextclade::isQcConfigVersionRecent(qcRulesConfig)) {
        logger.warn(
          "The version of QC configuration file \"{:s}\" (`\"schemaVersion\": \"{:s}\"`) is older than the QC "
          "configuration version expected by Nextclade ({:s}). "
          "You might be missing out on new features. It is recommended to download the latest QC configuration file.",
          inputQcConfig, qcRulesConfig.schemaVersion, Nextclade::getQcConfigJsonSchemaVersion());
      }

      const auto treeString = readFile(inputTree);

      std::vector<Nextclade::PcrPrimer> pcrPrimers;
      if (inputPcrPrimers) {
        const auto pcrPrimersCsvString = readFile(*inputPcrPrimers);
        std::vector<std::string> warnings;
        pcrPrimers =
          Nextclade::parseAndConvertPcrPrimersCsv(pcrPrimersCsvString, *inputPcrPrimers, refData.seq, warnings);
      }

      const auto outputPaths = getOutputPaths(*cliParams, genes);
      logger.info(formatOutputPaths(outputPaths));

      auto outputJsonStream = openOutputFileMaybe(cliParams->outputJson);
      auto outputCsvStream = openOutputFileMaybe(cliParams->outputCsv);
      auto outputTsvStream = openOutputFileMaybe(cliParams->outputTsv);
      auto outputTreeStream = openOutputFileMaybe(cliParams->outputTree);

      std::ofstream outputFastaStream;
      openOutputFile(outputPaths.outputFasta, outputFastaStream);

      std::ofstream outputInsertionsStream;
      openOutputFile(outputPaths.outputInsertions, outputInsertionsStream);
      outputInsertionsStream << "seqName,insertions\n";

      std::ofstream outputErrorsFile;
      openOutputFile(outputPaths.outputErrors, outputErrorsFile);
      outputErrorsFile << "seqName,errors,warnings,failedGenes\n";

      std::map<std::string, std::ofstream> outputGeneStreams;
      for (const auto& [geneName, outputGenePath] : outputPaths.outputGenes) {
        auto result = outputGeneStreams.emplace(std::make_pair(geneName, std::ofstream{}));
        auto& outputGeneFile = result.first->second;
        openOutputFile(outputGenePath, outputGeneFile);
      }

      int parallelism = static_cast<int>(std::thread::hardware_concurrency());
      if (cliParams->jobs > 0) {
        tbb::global_control globalControl{tbb::global_control::max_allowed_parallelism,
          static_cast<size_t>(cliParams->jobs)};
        parallelism = cliParams->jobs;
      }

      logger.info("\nParallelism: {:d}\n", parallelism);

      bool inOrder = cliParams->inOrder;

      if (!inputGeneMap) {
        logger.warn(
          "Warning: Parameter `--input-gene-map` was not specified. Without a gene map sequences will not be "
          "translated, there will be no peptides in output files, aminoacid mutations will not be detected and "
          "nucleotide sequence alignment will not be informed by codon boundaries.");
      } else if (geneMap.empty()) {
        logger.warn(
          "Warning: Provided gene map is empty. Sequences will not be translated, there will be no peptides in output "
          "files, aminoacid mutations will not be detected and nucleotide sequence alignment will not be informed by "
          "codon boundaries.");
      }

      constexpr const auto TABLE_WIDTH = 92;
      logger.info("\nSequences:");
      logger.info("{:s}", std::string(TABLE_WIDTH, '-'));
      logger.info("| {:5s} | {:40s} | {:7s} | {:7s} | {:7s} | {:7s} |",//
        "Index", "Seq. name", "A.score", "A.start", "A.end", "Insert." //
      );
      logger.info("{:s}\n", std::string(TABLE_WIDTH, '-'));


      NextalignOptions options = cliOptionsToNextalignOptions(*cliParams);

      try {
        runNextclade(parallelism, inOrder, inputFastaStream, refData, qcRulesConfig, treeString, pcrPrimers, geneMap,
          options, outputJsonStream, outputCsvStream, outputTsvStream, outputTreeStream, outputFastaStream,
          outputInsertionsStream, outputErrorsFile, outputGeneStreams, shouldWriteReference, logger);
      } catch (const std::exception& e) {
        logger.error("Error: {:>16s} |", e.what());
      }

      logger.info("{:s}", std::string(TABLE_WIDTH, '-'));
    } catch (const std::exception& e) {
      logger.error("Error: {:s}", e.what());
      std::exit(1);
    }
  }
}// namespace Nextclade
