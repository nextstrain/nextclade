#include <fmt/format.h>
#include <nextclade_common/datasets.h>

#include "../generated/cli.h"
#include "commands.h"

namespace Nextclade {
  std::vector<Dataset> datasetListFilter(                  //
    const std::vector<Dataset>& inputDatasets,             //
    const std::shared_ptr<CliParamsDatasetList>& cliParams,//
    const std::string& thisVersion                         //
  ) {
    auto outputDatasets = inputDatasets;

    outputDatasets = getEnabledDatasets(outputDatasets);

    if (!cliParams->includeIncompatible) {
      outputDatasets = getCompatibleDatasets(outputDatasets, thisVersion);
    }

    if (!cliParams->includeOld) {
      outputDatasets = getLatestDatasets(outputDatasets);
    }

    if (!cliParams->name.empty()) {
      outputDatasets = filterDatasetsByName(outputDatasets, cliParams->name);
    }

    return outputDatasets;
  }
}// namespace Nextclade
