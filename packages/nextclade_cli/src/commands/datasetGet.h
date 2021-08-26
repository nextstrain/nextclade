#include <fmt/format.h>
#include <nextclade_common/datasets.h>

#include "../generated/cli.h"
#include "commands.h"

namespace Nextclade {
  std::vector<Dataset> datasetGetFilter(                  //
    const std::vector<Dataset>& inputDatasets,            //
    const std::shared_ptr<CliParamsDatasetGet>& cliParams,//
    const std::string& thisVersion                        //
  ) {
    auto outputDatasets = inputDatasets;

    outputDatasets = filterDatasetsByName(outputDatasets, cliParams->name);

    if (cliParams->tag.empty() || cliParams->tag == "latest") {
      outputDatasets = getLatestCompatibleDatasets(outputDatasets, thisVersion);
      outputDatasets = getEnabledDatasets(outputDatasets);
    } else {
      outputDatasets = filterDatasetsByTag(outputDatasets, cliParams->tag);
    }

    return outputDatasets;
  }
}// namespace Nextclade
