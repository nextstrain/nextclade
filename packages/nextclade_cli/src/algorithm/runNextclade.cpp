#include "runNextclade.h"

#include <nextalign/nextalign.h>
#include <nextclade/nextclade.h>
#include <tbb/concurrent_vector.h>
#include <tbb/parallel_pipeline.h>

#include <boost/algorithm/string.hpp>
#include <boost/algorithm/string/join.hpp>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "../io/Logger.h"
#include "../io/parseRefFastaFile.h"
#include "../utils/datetime.h"
#include "../utils/safe_cast.h"


namespace Nextclade {
  struct AlgorithmOutput {
    int index;
    std::string seqName;
    bool hasError;
    NextcladeResult result;
    std::exception_ptr error;
  };

  /**
  * Runs nextclade algorithm in a parallel pipeline
  */
  void runNextclade(
    /* in  */ int parallelism,
    /* in  */ bool inOrder,
    /* inout */ std::unique_ptr<FastaStream> &inputFastaStream,
    /* in  */ const ReferenceSequenceData &refData,
    /* in  */ const QcConfig &qcRulesConfig,
    /* in  */ const std::string &treeString,
    /* in  */ const std::vector<PcrPrimer> &pcrPrimers,
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
    /* out */ Logger &logger) {
    tbb::task_group_context context;
    const auto ioFiltersMode = inOrder ? tbb::filter_mode::serial_in_order : tbb::filter_mode::serial_out_of_order;

    const auto &ref = refData.seq;
    const auto &refName = refData.name;

    const NextcladeOptions options = {
      .ref = ref,
      .treeString = treeString,
      .pcrPrimers = pcrPrimers,
      .geneMap = geneMap,
      .qcRulesConfig = qcRulesConfig,
      .nextalignOptions = nextalignOptions,
    };

    NextcladeAlgorithm nextclade{options};
    const auto cladeNodeAttrKeys = nextclade.getCladeNodeAttrKeys();

    std::unique_ptr<Nextclade::CsvWriterAbstract> csv;
    if (outputCsvStream) {
      csv = createCsvWriter(CsvWriterOptions{.delimiter = ';'}, cladeNodeAttrKeys);
    }

    std::unique_ptr<Nextclade::CsvWriterAbstract> tsv;
    if (outputTsvStream) {
      tsv = createCsvWriter(CsvWriterOptions{.delimiter = '\t'}, cladeNodeAttrKeys);
    }

    // TODO(perf): consider using a thread-safe queue instead of a vector,
    //  or restructuring code to avoid concurrent access entirely
    tbb::concurrent_vector<AnalysisResult> resultsConcurrent;

    /** Input filter is a serial input filter function, which accepts an input stream,
   * reads and parses the contents of it, and returns parsed sequences */
    const auto inputFilter = tbb::make_filter<void, AlgorithmInput>(ioFiltersMode,//
      [&inputFastaStream](tbb::flow_control &fc) -> AlgorithmInput {
        AlgorithmInput input;
        if (!inputFastaStream->next(input)) {
          fc.stop();
          return {};
        }
        return input;
      });

    /** A set of parallel transform filter functions, each accepts a parsed sequence from the input filter,
   * runs nextclade algorithm sequentially and returns its result.
   * The number of filters is determined by the `--jobs` CLI argument */
    const auto transformFilters = tbb::make_filter<AlgorithmInput, AlgorithmOutput>(tbb::filter_mode::parallel,//
      [&nextclade](const AlgorithmInput &input) -> AlgorithmOutput {
        const auto &seqName = input.seqName;

        try {
          const auto seq = toNucleotideSequence(input.seq);
          const auto result = nextclade.run(seqName, seq);
          return {.index = input.index, .seqName = seqName, .hasError = false, .result = result, .error = nullptr};
        } catch (const std::exception &e) {
          const auto &error = std::current_exception();
          return {.index = input.index, .seqName = seqName, .hasError = true, .result = {}, .error = error};
        }
      });

    // HACK: prevent aligned ref and ref genes from being written multiple times
    // TODO: hoist ref sequence transforms - process and write results only once, outside of main loop
    bool refsHaveBeenWritten = !shouldWriteReference;

    /** Output filter is a serial ordered filter function which accepts the results from transform filters,
   * one at a time, displays and writes them to output streams */
    const auto outputFilter = tbb::make_filter<AlgorithmOutput, void>(ioFiltersMode,//
      [&refName, &outputFastaStream, &outputInsertionsStream, &outputErrorsFile, &outputGeneStreams, &csv, &tsv,
        &refsHaveBeenWritten, &logger, &resultsConcurrent, &outputJsonStream,
        &outputTreeStream](const AlgorithmOutput &output) {
        const auto index = output.index;
        const auto &seqName = output.seqName;
        const auto &refAligned = output.result.ref;
        const auto &queryAligned = output.result.query;
        const auto &queryPeptides = output.result.queryPeptides;
        const auto &refPeptides = output.result.refPeptides;
        const auto &insertions = output.result.analysisResult.insertions;
        const auto &warnings = output.result.warnings;

        const auto &result = output.result;
        logger.info("| {:5d} | {:40s} | {:7d} | {:7d} | {:7d} | {:7d} |",//
          index, seqName, result.analysisResult.alignmentScore, result.analysisResult.alignmentStart,
          result.analysisResult.alignmentEnd, result.analysisResult.totalInsertions//
        );

        const auto &error = output.error;
        if (error) {
          try {
            std::rethrow_exception(error);
          } catch (const std::exception &e) {
            const std::string &errorMessage = e.what();
            logger.warn("Warning: In sequence \"{:s}\": {:s}. Note that this sequence will be excluded from results.",
              seqName, errorMessage);
            outputErrorsFile << fmt::format("\"{:s}\",\"{:s}\",\"{:s}\",\"{:s}\"\n", seqName, e.what(), "", "<<ALL>>");
            if (csv) {
              csv->addErrorRow(seqName, errorMessage);
            }
            if (tsv) {
              tsv->addErrorRow(seqName, errorMessage);
            }
            return;
          }
        } else {
          std::vector<std::string> warningsCombined;
          std::vector<std::string> failedGeneNames;
          for (const auto &warning : warnings.global) {
            logger.warn("Warning: in sequence \"{:s}\": {:s}", seqName, warning);
            warningsCombined.push_back(warning);
          }

          for (const auto &warning : warnings.inGenes) {
            logger.warn("Warning: in sequence \"{:s}\": {:s}", seqName, warning.message);
            warningsCombined.push_back(warning.message);
            failedGeneNames.push_back(warning.geneName);
          }

          auto warningsJoined = boost::join(warningsCombined, ";");
          boost::replace_all(warningsJoined, R"(")", R"("")");// escape double quotes

          auto failedGeneNamesJoined = boost::join(failedGeneNames, ";");
          boost::replace_all(failedGeneNamesJoined, R"(")", R"("")");// escape double quotes

          outputErrorsFile << fmt::format("\"{:s}\",\"{:s}\",\"{:s}\",\"{:s}\"\n", seqName, "", warningsJoined,
            failedGeneNamesJoined);

          // TODO: hoist ref sequence transforms - process and write results only once, outside of main loop
          if (!refsHaveBeenWritten) {
            outputFastaStream << fmt::format(">{:s}\n{:s}\n", refName, refAligned);
            outputFastaStream.flush();

            for (const auto &peptide : refPeptides) {
              outputGeneStreams[peptide.name] << fmt::format(">{:s}\n{:s}\n", refName, peptide.seq);
              outputGeneStreams[peptide.name].flush();
            }

            refsHaveBeenWritten = true;
          }

          outputFastaStream << fmt::format(">{:s}\n{:s}\n", seqName, queryAligned);

          for (const auto &peptide : queryPeptides) {
            outputGeneStreams[peptide.name] << fmt::format(">{:s}\n{:s}\n", seqName, peptide.seq);
          }

          outputInsertionsStream << fmt::format("\"{:s}\",\"{:s}\"\n", seqName, formatInsertions(insertions));

          if (outputJsonStream || outputTreeStream) {
            resultsConcurrent.push_back(output.result.analysisResult);
          }

          if (csv) {
            csv->addRow(output.result.analysisResult);
          }
          if (tsv) {
            tsv->addRow(output.result.analysisResult);
          }
        }
      });

    try {
      tbb::parallel_pipeline(parallelism, inputFilter & transformFilters & outputFilter, context);
    } catch (const std::exception &e) {
      logger.error("Error: when running the internal parallel pipeline: {:s}", e.what());
    }

    if (csv && outputCsvStream) {
      csv->write(*outputCsvStream);
    }

    if (tsv && outputTsvStream) {
      tsv->write(*outputTsvStream);
    }

    if (outputJsonStream || outputTreeStream) {
      // TODO: try to avoid copy here
      std::vector<AnalysisResult> results{resultsConcurrent.cbegin(), resultsConcurrent.cend()};

      if (outputJsonStream) {
        *outputJsonStream << serializeResults(AnalysisResults{
          .schemaVersion = Nextclade::getAnalysisResultsJsonSchemaVersion(),
          .nextcladeVersion = Nextclade::getVersion(),
          .timestamp = safe_cast<uint64_t>(getTimestampNow()),
          .cladeNodeAttrKeys = cladeNodeAttrKeys,
          .results = results,
        });
      }

      if (outputTreeStream) {
        const auto &tree = nextclade.finalize(results);
        (*outputTreeStream) << tree.serialize();
      }
    }
  }
}// namespace Nextclade
