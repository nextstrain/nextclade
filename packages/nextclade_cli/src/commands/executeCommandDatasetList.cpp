#include <fmt/format.h>

#include "../generated/cli.h"
#include "commands.h"

namespace Nextclade {
  void executeCommandDatasetList(const CliParamsDatasetList& cliParams) {
    Logger logger{Logger::Options{
      .linePrefix = "Nextclade",
      .verbosity = Logger::convertVerbosity(cliParams.verbosity),
      .verbose = cliParams.verbose,
      .silent = cliParams.silent,
    }};

    fmt::print("callback: dataset list\n");

    //  const auto datasetsJson = Nextclade::fetchDatasetsJson();

    //  const std::string thisVersion = Nextclade::getVersion();

    //  fmt::print("All datasets:\n\n");
    //  fmt::print("{:s}\n", formatDatasets(datasetsJson.datasets));
    //
    //  fmt::print("Latest datasets compatible with this version of Nextclade ({:s}):\n\n", thisVersion);
    //  fmt::print("{:s}\n", formatDatasets(Nextclade::getLatestCompatibleDatasets(datasetsJson.datasets, thisVersion)));
    //
    //  fmt::print("Latest datasets:\n\n");
    //  fmt::print("{:s}\n", formatDatasets(Nextclade::getLatestDatasets(datasetsJson.datasets)));
    //
    //  fmt::print("Datasets compatible with this version of Nextclade ({:s}):\n\n", thisVersion);
    //  fmt::print("{:s}\n", formatDatasets(Nextclade::getCompatibleDatasets(datasetsJson.datasets, thisVersion)));

    //  fflush(stdout);
  }
}// namespace Nextclade
