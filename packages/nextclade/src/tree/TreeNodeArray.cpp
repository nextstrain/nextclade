#include "TreeNodeArray.h"

#include <fmt/format.h>

#include <functional>
#include <memory>
#include <nlohmann/json.hpp>
#include <string>

#include "TreeNode.h"
#include "utils/safe_cast.h"

namespace Nextclade {
  using json = nlohmann::ordered_json;

  class ErrorTreeNodeArrayNotArray : public std::runtime_error {
  public:
    explicit ErrorTreeNodeArrayNotArray(const json& node)
        : std::runtime_error(fmt::format(
            "When accessing json node: The node is expected to be an array, but found this instead: \"{:s}\"", node)) {}
  };


  class TreeNodeArrayImpl {
    json j;


  public:
    struct const_tag {};

    explicit TreeNodeArrayImpl(json& js) : j(js) {
      ensureIsArray();
    }

    int size() const {
      return safe_cast<int>(j.size());
    }

    TreeNode operator[](int index) {
      return TreeNode{j[index]};
    }

    void ensureIsArray() const {
      if (!j.is_array()) {
        throw ErrorTreeNodeArrayNotArray(j);
      }
    }

    TreeNodeArray filter(const std::function<bool(const TreeNode&)>& predicate) const {
      ensureIsArray();

      auto filtered = json::array();
      for (const auto& elem : j) {
        json copy;
        copy.update(elem);
        TreeNode node{copy};
        if (predicate(node)) {
          filtered.push_back(elem);
        }
      }

      return TreeNodeArray{filtered};
    }

    void forEach(const std::function<void(const TreeNode&)>& action, const_tag) const {
      ensureIsArray();

      for (const auto& elem : j) {
        json copy;
        copy.update(elem);
        TreeNode node{copy};
        action(node);
      }
    }

    void forEach(const std::function<void(TreeNode&)>& action) {
      ensureIsArray();

      for (auto& elem : j) {
        TreeNode candidate{elem};
        action(candidate);
      }
    }
  };

  TreeNodeArray::TreeNodeArray(json& j) : pimpl(std::make_unique<TreeNodeArrayImpl>(j)) {}

  TreeNodeArray::~TreeNodeArray() {}// NOLINT(modernize-use-equals-default)

  int TreeNodeArray::size() const {
    return pimpl->size();
  }

  TreeNode TreeNodeArray::operator[](int index) const {
    return pimpl->operator[](index);
  }

  TreeNode TreeNodeArray::operator[](int index) {
    return pimpl->operator[](index);
  }

  TreeNodeArray TreeNodeArray::filter(const std::function<bool(const TreeNode&)>& predicate) const {
    return pimpl->filter(predicate);
  }

  void TreeNodeArray::forEach(const std::function<void(const TreeNode&)>& action) const {
    return pimpl->forEach(action, TreeNodeArrayImpl::const_tag{});
  }

  void TreeNodeArray::forEach(const std::function<void(TreeNode&)>& action) {
    return pimpl->forEach(action);
  }
}// namespace Nextclade
