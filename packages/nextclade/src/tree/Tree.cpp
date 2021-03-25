#include "Tree.h"

#include <string>

#include "TreeNode.h"


// Goes last (or at least after forward declarations of this library)
#include <nlohmann/json.hpp>


namespace Nextclade {
  using json = nlohmann::ordered_json;

  class ErrorAuspiceJsonV2TreeNotFound : public std::runtime_error {
  public:
    explicit ErrorAuspiceJsonV2TreeNotFound()
        : std::runtime_error("Auspice Json v2: format is invalid: .tree is not found") {}
  };

  class TreeImpl {
    json j;

  public:
    explicit TreeImpl(const std::string& auspiceJsonV2) : j(json::parse(auspiceJsonV2)) {}

    TreeNode root() const {
      auto root = j["tree"];
      if (!root.is_object()) {
        throw ErrorAuspiceJsonV2TreeNotFound();
      }
      return TreeNode{std::move(root)};
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
}// namespace Nextclade
