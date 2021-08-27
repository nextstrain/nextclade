#include <fmt/format.h>
#include <nextclade_common/datasets.h>
#include <nextclade_common/filesystem.h>

#include "../generated/cli.h"
#include "commands.h"
#include "datasetGet.h"

namespace Nextclade {
  class ErrorDatasetVersionedNotFound : public std::runtime_error {
    static inline std::string formatMessage(const std::string& name, const std::string& ref, const std::string& tag) {
      auto msg = fmt::format("Dataset not found: name='{:s}'", name);
      if (!ref.empty()) {
        msg += fmt::format(", reference='{:s}'", ref);
      }
      if (!tag.empty()) {
        msg += fmt::format(", tag='{:s}'", tag);
      }
      return msg;
    }

  public:
    inline explicit ErrorDatasetVersionedNotFound(const std::string& name, const std::string& ref,
      const std::string& tag)
        : std::runtime_error(formatMessage(name, ref, tag)) {}
  };

  void executeCommandDatasetGet(const std::shared_ptr<CliParamsDatasetGet>& cliParams) {
    Logger logger{Logger::Options{
      .linePrefix = "Nextclade",
      .verbosity = Logger::convertVerbosity(cliParams->verbosity),
      .verbose = cliParams->verbose,
      .silent = cliParams->silent,
    }};

    const auto datasetsIndexJson = fetchDatasetsIndexJson();
    const std::string thisVersion = getVersion();

    auto datasets = datasetGetFilter(datasetsIndexJson.datasets, cliParams, thisVersion);

    logger.info("Requested dataset: name='{}', reference='{}', tag='{}'", cliParams->name, cliParams->reference,
      cliParams->tag);

    if (datasets.empty()) {
      throw ErrorDatasetVersionedNotFound(cliParams->name, cliParams->reference, cliParams->tag);
    }


    if (datasets.size() > 1) {
      throw ErrorFatal(
        "When running dataset get filter: Returned more than 1 dataset."
        " This is a bug. Please report it to developers.");
    }

    if (datasets[0].datasetRefs.size() > 1) {
      throw ErrorFatal(
        "When running dataset get filter: Returned more than 1 dataset ref."
        " This is a bug. Please report it to developers.");
    }

    if (datasets[0].datasetRefs[0].versions.size() > 1) {
      throw ErrorFatal(
        "When running dataset get filter: Returned more than 1 version."
        " This is a bug. Please report it to developers.");
    }

    const auto& dataset = datasets[0];
    const auto& reference = datasets[0].datasetRefs[0].reference;
    const auto& version = datasets[0].datasetRefs[0].versions[0];
    logger.info("Downloading dataset: name='{}', reference='{}', tag='{}'", dataset.name, reference.accession,
      version.tag);

    fetchDatasetVersion(version, cliParams->outputDir);

    logger.info("Dataset written to {}", cliParams->outputDir);
  }
}// namespace Nextclade
