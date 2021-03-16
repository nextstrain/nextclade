#pragma once

#include <rapidjson/fwd.h>

#include <functional>

namespace Nextclade {

  class TreeNode;

  class TreeNodeArray {
    rapidjson::Value* value;
    rapidjson::MemoryPoolAllocator<rapidjson::CrtAllocator>* a;

  public:
    explicit TreeNodeArray(rapidjson::Value* value, rapidjson::MemoryPoolAllocator<rapidjson::CrtAllocator>* a);

    TreeNodeArray filter(const std::function<bool(TreeNode)>& predicate) const;

    void forEach(const std::function<void(TreeNode)>& action);
  };


}// namespace Nextclade
