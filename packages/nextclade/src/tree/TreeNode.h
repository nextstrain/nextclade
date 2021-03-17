#pragma once

#include <rapidjson/fwd.h>

#include <map>
#include <string>

#include "TreeNodeArray.h"

enum class Nucleotide : char;

namespace Nextclade {
  struct NucleotideSubstitution;

  class TreeNode {
    rapidjson::Value* value;
    rapidjson::MemoryPoolAllocator<rapidjson::CrtAllocator>* a;

  public:
    explicit TreeNode(rapidjson::Value* value, rapidjson::MemoryPoolAllocator<rapidjson::CrtAllocator>* a);

    rapidjson::Value* get(const char* path) const;

    rapidjson::Value* get(const char* path);

    TreeNodeArray children() const;

    void setNodeAttr(const char* name, const char* val);

    void setNodeAttr(const char* name, const std::map<int, Nucleotide>& data);

    void setNodeAttr(const char* name, int data);

    std::map<int, Nucleotide> substitutions() const;

    std::vector<NucleotideSubstitution> nucleotideMutations() const;
    void removeNodeAttr(const char* name);
  };
}// namespace Nextclade
