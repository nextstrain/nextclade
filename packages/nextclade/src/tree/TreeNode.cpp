#include "TreeNode.h"

#include <nextclade/nextclade.h>
#include <rapidjson/document.h>
#include <rapidjson/pointer.h>

#include <string>

#include "../../../nextalign/src/alphabet/nucleotides.h"
#include "TreeNodeArray.h"

namespace Nextclade {


  TreeNode::TreeNode(rapidjson::Value* value) : value(value) {}

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
    return TreeNodeArray{childrenValue};
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

}// namespace Nextclade
