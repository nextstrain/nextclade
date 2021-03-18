#pragma once

#include <rapidjson/fwd.h>

#include <map>
#include <optional>
#include <string>

#include "TreeNodeArray.h"

enum class Nucleotide : char;

namespace Nextclade {
  struct NucleotideSubstitution;

  class TreeNode {
    rapidjson::Value* value;
    rapidjson::MemoryPoolAllocator<rapidjson::CrtAllocator>* a;

  public:
    TreeNode();

    explicit TreeNode(rapidjson::Value* value, rapidjson::MemoryPoolAllocator<rapidjson::CrtAllocator>* a);

    rapidjson::Value* get(const char* path) const;

    rapidjson::Value* get(const char* path);

    TreeNodeArray children() const;

    std::map<int, Nucleotide> substitutions() const;

    std::map<int, Nucleotide> mutations() const;

    std::vector<NucleotideSubstitution> nucleotideMutations() const;

    void setNucleotideMutationsEmpty();

    std::optional<double> divergence() const;

    int id() const;

    std::string clade() const;

    bool isReferenceNode() const;

    bool isLeaf() const;

    std::string name() const;

    void setName(const std::string& name);

    void setNodeAttr(const char* name, const char* val);

    void setNodeAttr(const char* name, const std::map<int, Nucleotide>& data);

    void setNodeAttr(const char* name, int data);

    void removeNodeAttr(const char* name);

    void assign(const TreeNode& node) const;

    void addChild(const TreeNode& node);
  };
}// namespace Nextclade
