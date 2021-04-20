#pragma once

// clang-format off
#include <nlohmann/json_fwd.hpp>
// clang-format on

#include <functional>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <vector>

enum class Nucleotide : char;

namespace Nextclade {
  using json = nlohmann::ordered_json;

  struct NucleotideSubstitution;
  class TreeNodeImpl;

  class TreeNode {
    std::shared_ptr<TreeNodeImpl> pimpl;

    friend class TreeNodeImpl;

    struct const_tag {};

  public:
    explicit TreeNode(json& j);

    ~TreeNode() = default;

    TreeNode(const TreeNode& other) = default;

    TreeNode& operator=(const TreeNode& other) = default;

    TreeNode(TreeNode&& other) noexcept = default;

    TreeNode& operator=(TreeNode&& other) noexcept = default;

    TreeNode addChildFromCopy(const TreeNode& node);

    void assign(const TreeNode& node);

    TreeNode addChild();

    void forEachChildNode(const std::function<void(const TreeNode&)>& action) const;

    void forEachChildNode(const std::function<void(TreeNode&)>& action);

    int id() const;

    void setId(int id);

    std::map<int, Nucleotide> substitutions() const;

    std::map<int, Nucleotide> mutations() const;

    void setMutations(const std::map<int, Nucleotide>& data);

    void setSubstitutions(const std::map<int, Nucleotide>& data);

    std::vector<NucleotideSubstitution> nucleotideMutations() const;

    void setNucleotideMutationsEmpty();

    void setBranchAttrMutations(const std::map<std::string, std::vector<std::string>>& mutations);

    std::optional<double> divergence() const;

    void setDivergence(double div);

    std::string clade() const;

    void setClade(const std::string& clade);

    bool isReferenceNode() const;

    void setNodeType(const std::string& nodeType);

    bool isLeaf() const;

    std::string name() const;

    void setName(const std::string& name);

    void setNodeAttr(const std::string& name, const std::string& val);

    void removeNodeAttr(const std::string& name);

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

  class ErrorTreeNodeTypeInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeTypeInvalid(const json& node);
  };

}// namespace Nextclade
