#include "TreeNode.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <rapidjson/document.h>
#include <rapidjson/pointer.h>

#include <string>

#include "../../../nextalign/src/alphabet/nucleotides.h"
#include "../io/parseMutation.h"
#include "TreeNodeArray.h"

namespace Nextclade {
  class ErrorTreeNodeIdInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeIdInvalid()
        : std::runtime_error(
            "When accessing Tree Node ID: the ID is invalid. This is an internal issue. Please report this to "
            "developers, providing data and parameters you used, in ord-er to replicate the error.") {}
  };

  class ErrorTreeNodeCladeInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeCladeInvalid()
        : std::runtime_error(
            "When accessing clade of the tree node: the clade is missing or invalid. Make sure all reference tree "
            "nodes have `clade_membership` field assigned. Please report this to "
            "developers, providing data and parameters you used, in ord-er to replicate the error.") {}
  };

  TreeNode::TreeNode() = default;

  TreeNode::TreeNode(rapidjson::Value* value, rapidjson::MemoryPoolAllocator<rapidjson::CrtAllocator>* a)
      : value(value),
        a(a) {}

  rapidjson::Value* TreeNode::get(const char* path) const {
    rapidjson::Value* result = rapidjson::Pointer(path).Get(*value);
    if (!result) {
      return nullptr;
    }
    return result;
  }

  rapidjson::Value* TreeNode::get(const char* path) {
    return const_cast<rapidjson::Value*>(// NOLINT(cppcoreguidelines-pro-type-const-cast)
      std::as_const(*this).get(path)     //
    );
  }

  TreeNodeArray TreeNode::children() const {
    auto* childrenValue = get("/children");
    return TreeNodeArray{childrenValue, a};
  }

  void TreeNode::addChild(const TreeNode& node) {
    auto childrenPtr = rapidjson::Pointer("/children");
    auto* childrenValue = childrenPtr.Get(*value);

    if (!childrenValue || !childrenValue->IsArray()) {
      rapidjson::Value emptyArray;
      emptyArray.SetArray();
      childrenPtr.Create(emptyArray, *a);
      childrenValue = childrenPtr.Get(*value);
    }

    childrenValue->PushBack(*node.value, *a);
  }

  std::map<int, Nucleotide> TreeNode::substitutions() const {
    auto* substitutionsValue = get("/substitutions");
    if (substitutionsValue == nullptr) {
      return {};
    }

    std::map<int, Nucleotide> substitutions;
    if (substitutionsValue->IsObject()) {
      for (const auto& substitution : substitutionsValue->GetObject()) {
        const auto pos = substitution.name.GetInt();
        const std::string sub = substitution.value.GetString();
        const auto nuc = toNucleotide(sub[0]);
        substitutions.insert({pos, nuc});
      }
    }
    return substitutions;
  }

  std::map<int, Nucleotide> TreeNode::mutations() const {
    auto* substitutionsValue = get("/mutations");
    if (substitutionsValue == nullptr) {
      return {};
    }

    std::map<int, Nucleotide> substitutions;
    if (substitutionsValue->IsObject()) {
      for (const auto& substitution : substitutionsValue->GetObject()) {
        const auto pos = substitution.name.GetInt();
        const std::string sub = substitution.value.GetString();
        const auto nuc = toNucleotide(sub[0]);
        substitutions.insert({pos, nuc});
      }
    }
    return substitutions;
  }

  std::vector<NucleotideSubstitution> TreeNode::nucleotideMutations() const {
    auto* nucMutsValue = get("/branch_attrs/mutations/nuc");
    std::vector<NucleotideSubstitution> nucMuts;
    if (nucMutsValue && nucMutsValue->IsArray()) {
      const auto& nucMutsArray = nucMutsValue->GetArray();
      nucMuts.reserve(nucMutsArray.Size());
      for (const auto& mutStrValue : nucMutsArray) {
        const auto* mutStr = mutStrValue.GetString();
        if (mutStr) {
          nucMuts.push_back(parseMutation(mutStr));
        }
      }
      nucMuts.shrink_to_fit();
    }

    return nucMuts;
  }

  void TreeNode::setNucleotideMutationsEmpty() {
    constexpr auto path = "/branch_attrs/mutations/nuc";
    auto mutsPtr = rapidjson::Pointer(path);
    auto* mutsValue = mutsPtr.Get(*value);

    if (!mutsValue || !mutsValue->IsArray()) {
      mutsPtr.Create(*value, *a);
      mutsValue = mutsPtr.Get(*value);
      mutsValue->SetArray();
    }

    mutsValue->Clear();
  }

  std::optional<double> TreeNode::divergence() const {
    rapidjson::Value* divergenceValue = get("/node_attrs/div");
    if (divergenceValue && divergenceValue->IsNumber()) {
      return divergenceValue->Get<double>();
    }
    return {};
  }

  int TreeNode::id() const {
    rapidjson::Value* idValue = get("/node_attrs/id/value");
    if (idValue && idValue->IsNumber()) {
      return idValue->Get<int>();
    }

    throw ErrorTreeNodeIdInvalid();
  }

  std::string TreeNode::clade() const {
    rapidjson::Value* cladeValue = get("/node_attrs/clade_membership/value");
    if (cladeValue && cladeValue->IsString()) {
      return cladeValue->GetString();
    }

    throw ErrorTreeNodeCladeInvalid();
  }

  bool TreeNode::isReferenceNode() const {
    rapidjson::Value* idValue = get("/node_attrs/Node Type/value");
    return idValue && idValue->IsString() && idValue->GetString() == std::string{"Reference"};
  }

  bool TreeNode::isLeaf() const {
    auto* childrenValue = get("/children");
    return !childrenValue || !childrenValue->IsArray();
  }

  std::string TreeNode::name() const {
    const auto* nameValue = rapidjson::Pointer("/name").Get(*value);
    if (!nameValue || !nameValue->IsString()) {
      return "";
    }
    return nameValue->Get<const char*>();
  }

  void TreeNode::setName(const std::string& name) {
    rapidjson::Pointer("/name").Set(*value, name, *a);
  }


  void TreeNode::setNodeAttr(const char* name, const char* val) {
    const auto path = fmt::format("/node_attrs/{}/value", name);
    rapidjson::Pointer(path.c_str()).Create(*value, *a).Set(val, *a);
  }

  void TreeNode::setNodeAttr(const char* name, const std::map<int, Nucleotide>& data) {
    const auto path = fmt::format("/node_attrs/{}/value", name);

    rapidjson::Value obj;
    obj.SetObject();

    for (const auto& item : data) {
      rapidjson::Value objKey;
      objKey.SetString(std::to_string(item.first), *a);

      rapidjson::Value objVal;
      const auto nucStr = std::to_string(nucToChar(item.second));
      objVal.SetString(nucStr, *a);

      obj.AddMember(objKey, objVal, *a);
    }

    rapidjson::Pointer(path.c_str()).Set(*value, obj, *a);
  }

  void TreeNode::setNodeAttr(const char* name, int data) {
    const auto path = fmt::format("/node_attrs/{}/value", name);
    rapidjson::Pointer(path.c_str()).Set(*value, data, *a);
  }

  void TreeNode::removeNodeAttr(const char* name) {
    auto* nodeAttrs = rapidjson::Pointer("/node_attrs").Get(*value);
    if (nodeAttrs) {
      nodeAttrs->RemoveMember(name);
    }
  }

  /**
   * Performs deep copy assignment of the given node's data to `this` node
   */
  void TreeNode::assign(const TreeNode& node) const {
    value->CopyFrom(*node.value, *a);
  }
}// namespace Nextclade
