#include "serializeVirusJson.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade_json/nextclade_json.h>

#include <nlohmann/json.hpp>


namespace Nextclade {
  using json = nlohmann::ordered_json;

  std::string serializeVirusJson(VirusJson& virusJson) {
    auto j = json::object();

    writeValue(j, "/schemaVersion", virusJson.schemaVersion);

    std::map<std::string, std::vector<std::string>> nucMutLabelMaps;

    for (const auto& labeled : virusJson.nucMutLabelMaps.substitutionLabelMap) {
      auto mutStr = formatMutationSimple(labeled.substitution);
      for (const auto& label : labeled.labels) {
        nucMutLabelMaps[mutStr].push_back(label);
      }
    }

    for (const auto& labeled : virusJson.nucMutLabelMaps.deletionLabelMap) {
      auto mutStr = formatDeletionSimple(labeled.deletion);
      for (const auto& label : labeled.labels) {
        nucMutLabelMaps[mutStr].push_back(label);
      }
    }

    j[json_pointer{"/nucMutLabelMap"}] = nucMutLabelMaps;

    return jsonStringify(j);
  }

}//namespace Nextclade
