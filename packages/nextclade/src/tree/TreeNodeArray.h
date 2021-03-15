#pragma once

#include <rapidjson/fwd.h>

#include <functional>

namespace Nextclade {

  class TreeNode;

  class TreeNodeArray {
    rapidjson::Value* value;

  public:
    explicit TreeNodeArray(rapidjson::Value* value);

    TreeNodeArray filter(const std::function<bool(TreeNode)>& predicate) const;

    void forEach(const std::function<void(TreeNode)>& action) const;
  };


}// namespace Nextclade
