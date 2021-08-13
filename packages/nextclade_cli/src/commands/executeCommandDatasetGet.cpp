#include <fmt/format.h>
#include <nextclade_common/datasets.h>
#include <nextclade_common/filesystem.h>

#include "../generated/cli.h"
#include "commands.h"
#include "datasetGet.h"

namespace Nextclade {
  class ErrorDatasetVersionedNotFound : public std::runtime_error {
    static inline std::string formatMessage(const std::string& name, const std::string& version) {
      if (version.empty()) {
        return fmt::format(R"(Dataset not found: "{:s}")", name);
      }
      return fmt::format(R"(Dataset not found: "{:s}" version "{:s}")", name, version);
    }

  public:
    inline explicit ErrorDatasetVersionedNotFound(const std::string& name, const std::string& version)
        : std::runtime_error(formatMessage(name, version)) {}
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

    logger.info("Downloading dataset:\n{:s}\n", formatDatasets(datasets));

    if (datasets.empty()) {
      throw ErrorDatasetVersionedNotFound(cliParams->name, cliParams->tag);
    }


    if (datasets.size() > 1) {
      throw ErrorFatal(
        "When running dataset get filter: Returned more than 1 dataset."
        " This is a bug. Please report it to developers.");
    }

    if (datasets[0].versions.size() > 1) {
      throw ErrorFatal(
        "When running dataset get filter: Returned more than 1 version."
        " This is a bug. Please report it to developers.");
    }

    const auto& dataset = datasets[0];
    const auto& version = datasets[0].versions[0];

    auto outputSubdir = cliParams->outputSubdir;
    if (outputSubdir.empty()) {
      outputSubdir = fmt::format("{}_{}", dataset.name, version.datetime);
    }

    const auto outputPath = (fs::path(cliParams->outputDir) / outputSubdir).string();
    fetchDatasetVersion(datasets[0].versions[0], outputPath);
  }
}// namespace Nextclade
