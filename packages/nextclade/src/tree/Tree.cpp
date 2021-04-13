#include "Tree.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <string>

#include "../io/formatQcStatus.h"
#include "../io/jsonStringify.h"
#include "TreeNode.h"


// Goes last (or at least after forward declarations of this library)
// clang-format off
#include <nlohmann/json.hpp>
// clang-format on


namespace Nextclade {
  using json = nlohmann::ordered_json;

  json& get(json& js, const std::string& key, const json& defaultValue = json::object()) {
    if (!js.contains(key)) {
      js[key] = defaultValue;
    }
    return js.at(key);
  }

  class TreeImpl {
    json j;

  public:
    explicit TreeImpl(const std::string& auspiceJsonV2) : j(json::parse(auspiceJsonV2)) {}

    TreeNode root() {
      if (!j.is_object()) {
        throw ErrorAuspiceJsonV2Invalid(j);
      }

      auto root = j["tree"];
      if (!root.is_object()) {
        throw ErrorAuspiceJsonV2TreeNotFound(root);
      }

      return TreeNode{j.at("tree")};
    }

    void addMetadata() {
      if (!j.is_object()) {
        throw ErrorAuspiceJsonV2Invalid(j);
      }

      auto& meta = get(j, "meta", json::object());

      auto& colorings = get(meta, "colorings", json::array());

      // We need new colorings to be in the beginning of the array,
      // so that they are displayed first in Auspice UI
      auto newColorings = json::array();

      newColorings.emplace_back(json::object({
        {"key", "Node type"},
        {"title", "Node type"},
        {"type", "categorical"},
        {
          "scale",
          json::array({
            json::array({"New", "#ff6961"}),
            json::array({"Reference", "#999999"}),
          }),
        },
      }));

      newColorings.emplace_back(json::object({

        {"key", "QC Status"},
        {"title", "QC Status"},
        {"type", "categorical"},
        {
          "scale",
          json::array({
            json::array({formatQcStatus(QcStatus::good), "#417C52"}),
            json::array({formatQcStatus(QcStatus::mediocre), "#cab44d"}),
            json::array({formatQcStatus(QcStatus::bad), "#CA738E"}),
          }),
        },
      }));

      newColorings.emplace_back(json::object({
        {"key", "Has PCR primer changes"},
        {"title", "Has PCR primer changes"},
        {"type", "categorical"},
        {
          "scale",
          json::array({
            json::array({"Yes", "#6961ff"}),
            json::array({"No", "#999999"}),
          }),
        },
      }));

      // Push old colorings after the new ones
      for (const auto& coloring : colorings) {
        newColorings.push_back(coloring);
      }

      // Replace old colorings with new+old colorings
      colorings = newColorings;

      // Set region, country and division to "Unknown " (note space)
      for (auto& coloring : colorings) {
        const auto& key = coloring.at("key");
        if (key == "region" || key == "country" || key == "division") {
          const auto& title = coloring.at("title");
          const auto& type = coloring.at("type");
          const auto& oldScale = get(coloring, "scale", json::array());

          auto scale = json::array({
            json::array({"Unknown ", "#999999"}),
          });

          // Push old scales after the new ones
          for (const auto& sc : oldScale) {
            scale.push_back(sc);
          }

          coloring = json::object({
            {"key", key},
            {"scale", scale},
            {"title", title},
            {"type", type},
          });
        }
      }

      auto& displayDefaults = get(meta, "display_defaults", json::object());
      displayDefaults = json::object({
        {"branch_label", "clade"},
        {"color_by", "clade_membership"},
        {"distance_measure", "div"},
      });

      auto& panels = get(meta, "panels", json::array());
      panels = json::array({"tree", "entropy"});
      meta.erase("geo_resolutions");

      auto& filters = get(meta, "filters", json::array());
      auto newFilters = json::array({
        "clade_membership",
        "Node type",
        "QC Status",
        "Has PCR primer changes",
      });
      // Push old filters after the new ones
      for (const auto& filter : filters) {
        newFilters.push_back(filter);
      }
      filters = newFilters;
    }

    std::string serialize(int spaces = 4) const {
      return jsonStringify(j, spaces);
    }
  };

  Tree::Tree(const std::string& auspiceJsonV2) : pimpl(std::make_unique<TreeImpl>(auspiceJsonV2)) {}

  Tree::~Tree() {}// NOLINT(modernize-use-equals-default)

  TreeNode Tree::root() const {
    return pimpl->root();
  }

  void Tree::addMetadata() {
    return pimpl->addMetadata();
  }

  std::string Tree::serialize(int spaces) const {
    return pimpl->serialize(spaces);
  }

  ErrorAuspiceJsonV2Invalid::ErrorAuspiceJsonV2Invalid(const json& node)
      : std::runtime_error(
          fmt::format("When accessing Auspice Json v2 tree: format is invalid: expected to find an object, but found: "
                      "\"{}\"",
            node.dump())) {}

  ErrorAuspiceJsonV2TreeNotFound::ErrorAuspiceJsonV2TreeNotFound(const json& node)
      : std::runtime_error(fmt::format(
          "When parsing Auspice Json v2 tree: format is invalid: `tree` is expected to be an object, but found: "
          "\"{}\"",
          node.dump())) {}
}// namespace Nextclade
