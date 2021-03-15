#include "TreeNodeArray.h"

#include <rapidjson/document.h>
#include <rapidjson/pointer.h>

#include <functional>
#include <string>

#include "TreeNode.h"

namespace Nextclade {
  TreeNodeArray::TreeNodeArray(rapidjson::Value* value) : value(value) {}

  TreeNodeArray TreeNodeArray::filter(const std::function<bool(TreeNode)>& predicate) const {
    if (value->IsArray()) {
      auto a = rapidjson::MemoryPoolAllocator();
      rapidjson::Value result;
      for (auto&& item : value->GetArray()) {
        if (predicate(TreeNode{&item})) {
          result.PushBack(std::move(item), a);
        }
      }
      return TreeNodeArray{value};
    }

    return TreeNodeArray{nullptr};
  }

  void TreeNodeArray::forEach(const std::function<void(TreeNode)>& action) const {
    if (value->IsArray()) {
      auto a = rapidjson::MemoryPoolAllocator();
      rapidjson::Value result;
      for (auto&& item : value->GetArray()) {
        action(TreeNode{&item});
      }
    }
  }

}// namespace Nextclade
