#include <fmt/format.h>
#include <nextclade_common/datasets.h>

#include "../generated/cli.h"
#include "commands.h"

namespace Nextclade {
  inline std::vector<Dataset> datasetListFilter(           //
    const std::vector<Dataset>& inputDatasets,             //
    const std::shared_ptr<CliParamsDatasetList>& cliParams,//
    const std::string& thisVersion                         //
  ) {
    auto outputDatasets = inputDatasets;

    if (!cliParams->tag.empty()) {
      // NOTE: if a concrete version `tag` is specified, we skip 'enabled', 'compatibility' and 'latest' checks
      outputDatasets = filterDatasetsByTag(outputDatasets, cliParams->tag);
    } else {
      // NOTE: if no concrete version `tag` is specified, we perform 'enabled', 'compatibility' and 'latest' checks
      outputDatasets = getEnabledDatasets(outputDatasets);

      if (!cliParams->includeIncompatible) {
        outputDatasets = getCompatibleDatasets(outputDatasets, thisVersion);
      }

      if (!cliParams->includeOld) {
        outputDatasets = getLatestDatasets(outputDatasets);
      }
    }

    if (!cliParams->reference.empty()) {
      outputDatasets = filterDatasetsByReference(outputDatasets, cliParams->reference);
    }

    if (!cliParams->name.empty()) {
      outputDatasets = filterDatasetsByName(outputDatasets, cliParams->name);
    }

    return outputDatasets;
  }
}// namespace Nextclade
