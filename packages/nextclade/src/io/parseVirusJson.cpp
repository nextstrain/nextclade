#include "parseVirusJson.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade_json/nextclade_json.h>

#include <nlohmann/json.hpp>
#include <semver.hpp>

#include "parseAnalysisResults.h"
#include "parseMutation.h"


namespace Nextclade {
  using json = nlohmann::ordered_json;

  class ErrorVirusJsonParsingFailed : public ErrorFatal {
  public:
    explicit ErrorVirusJsonParsingFailed(const std::string& message)
        : ErrorFatal(fmt::format("When parsing virus.json file: {:s}", message)) {}
  };

  std::string parseMutationLabel(const json& labelJson) {
    if (!labelJson.is_string()) {
      throw ErrorFatal(
        fmt::format("Labels are expected to be of type 'string', but found: '{:s}'", labelJson.type_name()));
    }
    return labelJson.get<std::string>();
  }

  std::vector<std::string> parseMutationLabels(const json& labelsJson) {
    std::vector<std::string> labels;
    if (!labelsJson.is_array()) {
      throw ErrorFatal(
        fmt::format("Label map values are expected to be of type 'array', but found: '{:s}'", labelsJson.type_name()));
    }
    return parseArray<std::string>(labelsJson, parseMutationLabel);
  }

  template<typename Letter>
  void parseLabelMap(const json& j, const std::string& jsonPath, MutationLabelMaps<Letter>& labelMaps) {
    const auto ptr = json::json_pointer{jsonPath};
    if (!j.contains(ptr)) {
      throw ErrorFatal(fmt::format("Key not found: '{:s}'", jsonPath));
    }

    const auto& labelMapsJson = j.at(ptr);
    if (!labelMapsJson.is_object()) {
      throw ErrorFatal(fmt::format("Expected an 'object', but found: '{:s}'", labelMapsJson.type_name()));
    }

    for (const auto& [mutStr, labelsJson] : labelMapsJson.items()) {
      auto labels = parseMutationLabels(labelsJson);

      const auto mut = parseMutation(mutStr);
      if (isGap(mut.qry)) {
        labelMaps.deletionLabelMap.template emplace_back(DeletionSimpleLabeled<Letter>{
          .deletion =
            {
              .ref = mut.ref,
              .pos = mut.pos,
            },
          .labels = std::move(labels),
        });
      } else {
        labelMaps.substitutionLabelMap.template emplace_back(SubstitutionSimpleLabeled<Letter>{
          .substitution =
            {
              .ref = mut.ref,
              .pos = mut.pos,
              .qry = mut.qry,
            },
          .labels = std::move(labels),
        });
      };
    }
  }

  VirusJson parseVirusJson(const std::string& virusJsonStr) {
    try {
      json j = json::parse(virusJsonStr);

      VirusJson virusJson;

      readValue(j, "/schemaVersion", virusJson.schemaVersion);
      parseLabelMap<Nucleotide>(j, "/nucMutLabelMap", virusJson.nucMutLabelMaps);

      return virusJson;
    } catch (const std::exception& e) {
      throw ErrorVirusJsonParsingFailed(e.what());
    }
  }

}// namespace Nextclade
