#include "TreeNodeArray.h"

#include <rapidjson/document.h>

#include <functional>
#include <string>

#include "TreeNode.h"

namespace Nextclade {
  TreeNodeArray::TreeNodeArray(rapidjson::Value* value, rapidjson::MemoryPoolAllocator<rapidjson::CrtAllocator>* a)
      : value(value),
        a(a) {}

  TreeNodeArray TreeNodeArray::filter(const std::function<bool(TreeNode)>& predicate) const {
    if (value && value->IsArray()) {
      rapidjson::Value result;
      result.SetArray();
      for (auto& item : value->GetArray()) {
        if (predicate(TreeNode{&item, a})) {
          result.PushBack(std::move(item), *a);
        }
      }
      return TreeNodeArray{value, a};
    }

    return TreeNodeArray{nullptr, a};
  }

  void TreeNodeArray::forEach(const std::function<void(TreeNode)>& action) {
    if (value && value->IsArray()) {
      rapidjson::Value result;
      for (auto&& item : value->GetArray()) {
        action(TreeNode{&item, a});
      }
    }
  }

}// namespace Nextclade
