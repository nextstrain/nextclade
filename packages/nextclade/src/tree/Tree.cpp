#include "Tree.h"

#include <rapidjson/document.h>
#include <rapidjson/pointer.h>

#include <string>

namespace Nextclade {
  class ErrorAuspiceJsonV2TreeNotFound : public std::runtime_error {
  public:
    explicit ErrorAuspiceJsonV2TreeNotFound()
        : std::runtime_error("Auspice Json v2: format is invalid: .tree is not found") {}
  };

  class TreeImpl {
    rapidjson::Document json;

  public:
    explicit TreeImpl(const std::string& auspiceJsonV2) {
      json.Parse(auspiceJsonV2.c_str());
    }

    template<typename CharType, size_t N>
    auto get(const CharType (&source)[N]) {// NOLINT(cppcoreguidelines-avoid-c-arrays)
      return rapidjson::GetValueByPointer(json, source);
    }
  };

  Tree::Tree(const std::string& auspiceJsonV2) : pimpl(std::make_unique<TreeImpl>(auspiceJsonV2)) {}

  Tree::~Tree() {}// NOLINT(modernize-use-equals-default)

  TreeNode Tree::root() const {
    auto* treeRootValue = pimpl->get("/tree");
    if (treeRootValue->IsNull()) {
      throw ErrorAuspiceJsonV2TreeNotFound();
    }
    return TreeNode{treeRootValue};
  }
}// namespace Nextclade
