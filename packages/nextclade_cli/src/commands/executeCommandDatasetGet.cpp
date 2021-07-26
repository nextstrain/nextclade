#include <fmt/format.h>
#include <nextclade_common/datasets.h>

#include "../generated/cli.h"
#include "commands.h"

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

    const auto datasetsJson = fetchDatasetsJson();
    const std::string thisVersion = getVersion();

    auto datasets = datasetsJson.datasets;
    datasets = filterDatasetsByName(datasets, cliParams->name);

    if (cliParams->version.empty() || cliParams->version == "latest") {
      datasets = getLatestDatasets(datasets);
    } else {
      datasets = filterDatasetsByVersion(datasets, cliParams->version);
    }

    if (datasets.empty()) {
      throw ErrorDatasetVersionedNotFound(cliParams->name, cliParams->version);
    }

    logger.info("Downloading dataset:\n{:s}\n", formatDatasets(datasets));

    if (!cliParams->outputDir.empty()) {
      fetchDatasetVersion(datasets[0].versions[0], cliParams->outputDir);
    }
  }
}// namespace Nextclade
