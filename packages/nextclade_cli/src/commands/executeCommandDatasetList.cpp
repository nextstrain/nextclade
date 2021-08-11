#include <fmt/format.h>
#include <nextclade_common/datasets.h>

#include "../generated/cli.h"
#include "commands.h"
#include "datasetList.h"

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

    auto datasets = datasetListFilter(datasetsJson.datasets, cliParams, thisVersion);

    if (!cliParams->includeIncompatible && !cliParams->includeOld) {
      fmt::print("Latest datasets compatible with this version of Nextclade ({:s}):\n\n", thisVersion);
    } else if (!cliParams->includeIncompatible) {
      fmt::print("Latest datasets:\n\n");
    } else if (!cliParams->includeOld) {
      fmt::print("Datasets compatible with this version of Nextclade ({:s}):\n\n", thisVersion);
    } else {
      fmt::print("All datasets:\n\n");
    }

    if (!cliParams->name.empty()) {
      datasets = filterDatasetsByName(datasets, cliParams->name);
    }

    if (!datasets.empty()) {
      fmt::print("{:s}\n", formatDatasets(datasets));
    } else {
      fmt::print("Nothing found\n");
    }
  }
}// namespace Nextclade
