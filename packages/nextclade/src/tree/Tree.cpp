#include "Tree.h"

#include <string>

#include "TreeNode.h"


// Goes last (or at least after forward declarations of this library)
#include <fmt/format.h>

#include <nlohmann/json.hpp>


namespace Nextclade {
  using json = nlohmann::ordered_json;


  class TreeImpl {
    json j;

  public:
    explicit TreeImpl(const std::string& auspiceJsonV2) : j(json::parse(auspiceJsonV2)) {}

    TreeNode root() {
      auto root = j["tree"];
      if (!root.is_object()) {
        throw ErrorAuspiceJsonV2TreeNotFound(root);
      }
      return TreeNode{j.at("tree")};
    }

    std::string serialize() const {
      return std::string{j.dump(4)};
    }
  };

  Tree::Tree(const std::string& auspiceJsonV2) : pimpl(std::make_unique<TreeImpl>(auspiceJsonV2)) {}

  Tree::~Tree() {}// NOLINT(modernize-use-equals-default)

  TreeNode Tree::root() const {
    return pimpl->root();
  }

  std::string Tree::serialize() const {
    return pimpl->serialize();
  }


  ErrorAuspiceJsonV2TreeNotFound::ErrorAuspiceJsonV2TreeNotFound(const json& node)
      : std::runtime_error(fmt::format(
          "When parsing Auspice Json v2 tree: format is invalid: `tree` is expected to be an object, but found: "
          "\"{}\"",
          node.dump())) {}
}// namespace Nextclade
