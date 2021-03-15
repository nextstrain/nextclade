#include "TreeNode.h"

#include <nextclade/nextclade.h>
#include <rapidjson/document.h>
#include <rapidjson/pointer.h>

#include <string>

#include "../../../nextalign/src/alphabet/nucleotides.h"
#include "TreeNodeArray.h"

namespace Nextclade {


  TreeNode::TreeNode(rapidjson::Value* value) : value(value) {}

  TreeNodeArray TreeNode::children() const {
    auto* childrenValue = rapidjson::GetValueByPointer(*value, "/children");
    return TreeNodeArray{childrenValue};
  }

  std::map<int, Nucleotide> TreeNode::substitutions() const {
    auto* substitutionsValue = rapidjson::GetValueByPointer(*value, "/substitutions");
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
