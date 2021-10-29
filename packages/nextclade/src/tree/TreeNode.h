#pragma once

// clang-format off
#include <nlohmann/json_fwd.hpp>
// clang-format on

#include <nextalign/nextalign.h>
#include <nextclade/nextclade.h>

#include <functional>
#include <map>
#include <memory>
#include <optional>
#include <string>
#include <vector>

enum class Nucleotide : char;

namespace Nextclade {
  using json = nlohmann::ordered_json;

  struct AminoacidSubstitutionWithoutGene;
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

    TreeNode addChild();

    void forEachChildNode(const std::function<void(const TreeNode&)>& action) const;

    void forEachChildNode(const std::function<void(TreeNode&)>& action);

    int id() const;

    void setId(int id);

    std::map<int, Nucleotide> substitutions() const;

    std::map<int, Nucleotide> mutations() const;

    std::map<std::string, std::map<int, Aminoacid>> aaSubstitutions() const;

    std::map<std::string, std::map<int, Aminoacid>> aaMutations() const;

    std::vector<NucleotideSubstitution> nucleotideMutations() const;

    std::map<std::string, std::vector<AminoacidSubstitutionWithoutGene>> aminoacidMutations() const;

    void setMutations(const std::map<int, Nucleotide>& data);

    void setSubstitutions(const std::map<int, Nucleotide>& data);

    void setAaMutations(const std::map<std::string, std::map<int, Aminoacid>>& aaMutationMap);

    void setAaSubstitutions(const std::map<std::string, std::map<int, Aminoacid>>& aaSubstitutionMap);

    void setNucleotideMutationsEmpty();

    void setBranchAttrMutations(const PrivateNucleotideMutations& nucMutations,
      const std::map<std::string, PrivateAminoacidMutations>& aaMutations);

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

  class ErrorTreeNodeNotObject : public ErrorFatal {
  public:
    explicit ErrorTreeNodeNotObject(const json& node);
  };

  class ErrorTreeNodeMutationPositionInvalid : public ErrorFatal {
  public:
    explicit ErrorTreeNodeMutationPositionInvalid(const json& node);
  };

  class ErrorTreeNodeMutationNucleotideInvalid : public ErrorFatal {
  public:
    explicit ErrorTreeNodeMutationNucleotideInvalid(const json& node);
  };

  class ErrorTreeNodeMutationAminoacidInvalid : public ErrorFatal {
  public:
    explicit ErrorTreeNodeMutationAminoacidInvalid(const json& node);
  };

  class ErrorTreeNodeIdInvalid : public ErrorFatal {
  public:
    explicit ErrorTreeNodeIdInvalid(const json& node);
  };

  class ErrorTreeNodeCladeInvalid : public ErrorFatal {
  public:
    explicit ErrorTreeNodeCladeInvalid(const json& node);
  };

  class ErrorTreeNodeTypeMissing : public ErrorFatal {
  public:
    ErrorTreeNodeTypeMissing();
  };

  class ErrorTreeNodeTypeInvalid : public ErrorFatal {
  public:
    explicit ErrorTreeNodeTypeInvalid(const json& node);
  };

}// namespace Nextclade
