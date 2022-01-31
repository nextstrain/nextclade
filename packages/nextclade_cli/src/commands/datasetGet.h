#include <fmt/format.h>
#include <nextclade_common/datasets.h>

#include "../generated/cli.h"
#include "commands.h"

namespace Nextclade {
  inline safe_vector<Dataset> datasetGetFilter(           //
    const safe_vector<Dataset>& inputDatasets,            //
    const std::shared_ptr<CliParamsDatasetGet>& cliParams,//
    const std::string& thisVersion                        //
  ) {
    auto outputDatasets = inputDatasets;

    outputDatasets = filterDatasetsByName(outputDatasets, cliParams->name);

    if (cliParams->reference.empty() || cliParams->reference == "default") {
      // NOTE: if no concrete reference sequence is specified, yield datasets with default reference
      outputDatasets = filterDatasetsByDefaultReference(outputDatasets);
    } else {
      // NOTE: if a concrete reference sequence is specified, yield datasets with this reference only
      outputDatasets = filterDatasetsByReference(outputDatasets, cliParams->reference);
    }

    if (cliParams->tag.empty() || cliParams->tag == "latest") {
      // NOTE: if no concrete version `tag` is specified, return latest compatible
      outputDatasets = getLatestCompatibleDatasets(outputDatasets, thisVersion);
      outputDatasets = getEnabledDatasets(outputDatasets);
    } else {
      // NOTE: if a concrete version `tag` is specified, just filter based on this tag
      outputDatasets = filterDatasetsByTag(outputDatasets, cliParams->tag);
    }

    return outputDatasets;
  }
}// namespace Nextclade
