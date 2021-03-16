#include "TreeNode.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <rapidjson/document.h>
#include <rapidjson/pointer.h>

#include <string>

#include "../../../nextalign/src/alphabet/nucleotides.h"
#include "../parse/parseMutation.h"
#include "TreeNodeArray.h"

namespace Nextclade {
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

  std::vector<NucleotideSubstitution> TreeNode::nucleotideMutations() const {
    auto* nucMutsValue = get("/branch_attrs/mutations/nuc");
    if (nucMutsValue == nullptr) {
      return {};
    }

    std::vector<NucleotideSubstitution> nucMuts;
    if (nucMutsValue->IsArray()) {
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


}// namespace Nextclade
