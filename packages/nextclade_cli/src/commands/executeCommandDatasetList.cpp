#include <fmt/format.h>
#include <nextclade_common/datasets.h>

#include "../generated/cli.h"
#include "commands.h"

namespace Nextclade {
  void executeCommandDatasetList(const std::shared_ptr<CliParamsDatasetList>& cliParams) {
    Logger logger{Logger::Options{
      .linePrefix = "Nextclade",
      .verbosity = Logger::convertVerbosity(cliParams->verbosity),
      .verbose = cliParams->verbose,
      .silent = cliParams->silent,
    }};

    const auto datasetsJson = fetchDatasetsJson();
    const std::string thisVersion = getVersion();

    auto datasets = datasetsJson.datasets;
    if (cliParams->onlyCompatible && cliParams->onlyLatest) {
      fmt::print("Latest datasets compatible with this version of Nextclade ({:s}):\n\n", thisVersion);
      datasets = getLatestCompatibleDatasets(datasets, thisVersion);
    } else if (cliParams->onlyLatest) {
      fmt::print("Latest datasets:\n\n");
      datasets = getLatestDatasets(datasets);
    } else if (cliParams->onlyCompatible) {
      fmt::print("Datasets compatible with this version of Nextclade ({:s}):\n\n", thisVersion);
      datasets = getCompatibleDatasets(datasets, thisVersion);
    } else {
      fmt::print("All datasets:\n\n");
    }

    if (!cliParams->name.empty()) {
      datasets = filterDatasetsByName(datasets, cliParams->name);
    }

    if (!datasets.empty()) {
      fmt::print("{:s}\n", formatDatasets(datasets));
    }
  }
}// namespace Nextclade
