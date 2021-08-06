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

    // Print list of datasets
    // fmt::print("Only compatible is {}\n", cliParams->onlyCompatible);
    // fmt::print("Only latest is {}\n", cliParams->onlyLatest);

    auto datasets = datasetsJson.datasets;
    
    // datasets = getAllDatasets(datsets);
    fmt::print("Returning datasets:\n");

    if (!cliParams->name.empty()) {
      // datasets = filterDatasetsByName(datasets, cliParams->name);
      fmt::print("- with name ({}):\n", cliParams->name);
    }

    if (!cliParams->tag.empty()) {
      if (cliParams->tag == "latest") {
        // datasets = selectMostRecentDataset(datasets);
      } else {
        // datasets = filterDatasetsByTag(datasets, cliParams->tag);
      }
      fmt::print("- with tag: {}\n", cliParams->tag);
    }
    
    // Needs to come before `selectMostRecentDataset` due to non-commutativity
    if (!cliParams->includeIncompatible) {
      // datasets = filterDatasetsByCompatibility(datasets, thisVersion); //TODO: implement, if all incompatible add incompatibility text
      fmt::print("- compatible with this version of Nextclade ({:s}):\n", thisVersion);
    }
    else {
      fmt::print("- both compatible and incompatible with this version of Nextclade ({:s}):\n", thisVersion); 
    }

    if (!cliParams->multipleVersions) {
      // datasets = selectMostRecentDataset(datasets); // TODO: implement
      fmt::print("- that are the most recent\n");
    }

    fmt::print("\n");

    if (!datasets.empty()) {
      fmt::print("{:s}\n", formatDatasets(datasets));
    }
  }
}// namespace Nextclade
