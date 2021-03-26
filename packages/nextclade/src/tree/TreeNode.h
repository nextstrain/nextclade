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

  public:
    explicit TreeNode(json& j);

    ~TreeNode();

    TreeNode(const TreeNode& other) = delete;

    TreeNode& operator=(const TreeNode& other) = delete;

    TreeNode(TreeNode&& other) noexcept;

    TreeNode& operator=(TreeNode&& other) noexcept;

    TreeNodeArray children() const;

    TreeNode addChildFromCopy(const TreeNode& node);

    TreeNode addChild();

    int id() const;

    void setId(int id);

    std::map<int, Nucleotide> substitutions() const;

    std::map<int, Nucleotide> mutations() const;

    void setMutations(const std::map<int, Nucleotide>& data);

    void setSubstitutions(const std::map<int, Nucleotide>& data);

    std::vector<NucleotideSubstitution> nucleotideMutations() const;

    void setNucleotideMutationsEmpty();

    std::optional<double> divergence() const;

    void setDivergence(double div);

    std::string clade() const;

    void setClade(const std::string& clade);

    bool isReferenceNode() const;

    bool isLeaf() const;

    std::string name() const;

    void setName(const std::string& name);

    void setNodeAttr(const char* name, const char* val);

    void removeNodeAttr(const char* name);

    void removeTemporaries();
  };

  class ErrorTreeNodeNotObject : public std::runtime_error {
  public:
    explicit ErrorTreeNodeNotObject(const json& node);
  };

  class ErrorTreeNodeMutationPositionInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeMutationPositionInvalid(const json& node);
  };

  class ErrorTreeNodeMutationNucleotideInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeMutationNucleotideInvalid(const json& node);
  };

  class ErrorTreeNodeIdInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeIdInvalid(const json& node);
  };

  class ErrorTreeNodeCladeInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeCladeInvalid(const json& node);
  };

}// namespace Nextclade
