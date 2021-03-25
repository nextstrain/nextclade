#pragma once

// clang-format off
#include <nlohmann/json_fwd.hpp>
// clang-format on

#include <map>
#include <memory>
#include <optional>
#include <string>
#include <vector>

#include "TreeNodeArray.h"


enum class Nucleotide : char;

namespace Nextclade {
  using json = nlohmann::ordered_json;

  struct NucleotideSubstitution;
  class TreeNodeImpl;

  class TreeNode {
    std::unique_ptr<TreeNodeImpl> pimpl;

    friend class TreeNodeImpl;
    friend class TreeNodeArrayImpl;

    json getJson() const;

  public:
    TreeNode();

    explicit TreeNode(json&& j);

    ~TreeNode();

    TreeNode(const TreeNode& other) = delete;

    TreeNode& operator=(const TreeNode& other) = delete;

    TreeNode(TreeNode&& other) noexcept;

    TreeNode& operator=(TreeNode&& other) noexcept;

    TreeNodeArray children() const;

    void addChild(const TreeNode& node);

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

    void setNodeAttr(const char* name, int val);

    void removeNodeAttr(const char* name);

    void assign(const TreeNode& node);
  };
}// namespace Nextclade
