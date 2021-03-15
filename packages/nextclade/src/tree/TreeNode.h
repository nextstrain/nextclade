#pragma once

#include <rapidjson/fwd.h>

#include <map>
#include <string>

#include "TreeNodeArray.h"

enum class Nucleotide : char;

namespace Nextclade {
  class TreeNode {
    rapidjson::Value* value;

  public:
    explicit TreeNode(rapidjson::Value* value);

    TreeNodeArray children() const;

    std::map<int, Nucleotide> substitutions() const;
  };
}// namespace Nextclade
