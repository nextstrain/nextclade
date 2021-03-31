#include "Tree.h"

#include <fmt/format.h>

#include <string>

#include "../io/jsonStringify.h"
#include "TreeNode.h"


// Goes last (or at least after forward declarations of this library)
// clang-format off
#include <nlohmann/json.hpp>
// clang-format on


namespace Nextclade {
  using json = nlohmann::ordered_json;


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

    std::string serialize(int spaces = 4) const {
      return jsonStringify(j, spaces);
    }
  };

  Tree::Tree(const std::string& auspiceJsonV2) : pimpl(std::make_unique<TreeImpl>(auspiceJsonV2)) {}

  Tree::~Tree() {}// NOLINT(modernize-use-equals-default)

  TreeNode Tree::root() const {
    return pimpl->root();
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
