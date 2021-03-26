#include "TreeNode.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <iostream>
#include <nlohmann/json.hpp>
#include <string>

#include "../../../nextalign/src/alphabet/nucleotides.h"
#include "../io/parseMutation.h"
#include "TreeNodeArray.h"

namespace Nextclade {
  namespace {
    int parsePosition(const std::string& posStr) {
      try {
        return std::stoi(posStr);
      } catch (...) {
        throw ErrorTreeNodeMutationPositionInvalid(posStr);
      }
    }

    Nucleotide parseNucleotide(const json& nucJsonStr) {
      if (!nucJsonStr.is_string()) {
        throw ErrorTreeNodeMutationNucleotideInvalid(nucJsonStr);
      }

      const auto nucStr = nucJsonStr.get<std::string>();
      if (nucStr.size() != 1) {
        throw ErrorTreeNodeMutationNucleotideInvalid(nucStr);
      }

      return toNucleotide(nucStr[0]);
    }
  }// namespace

  class TreeNodeImpl {
    json& j;

    void ensureIsObject() const {
      if (!j.is_object()) {
        throw ErrorTreeNodeNotObject(j);
      }
    }

  public:
    explicit TreeNodeImpl(json& json) : j(json) {
      ensureIsObject();
    }

    json getJson() const {
      return j;
    }

    TreeNodeArray children() const {
      auto childrenArray = j.value("children", json::array());
      return TreeNodeArray{childrenArray};
    }

    TreeNode addChildFromCopy(const TreeNode& node) {
      auto childJson = json::object();
      childJson.update(node.pimpl->j);// Deep clone
      auto childrenJson = j.value("children", json::array());
      childrenJson.emplace_back(childJson);
      return TreeNode{childJson};
    }

    TreeNode addChild() {
      auto childJson = json::object();
      auto childrenJson = j.value("children", json::array());
      childrenJson.emplace_back(childJson);
      return TreeNode{childJson};
    }

    int id() const {
      const auto id = j.value("/tmp/id"_json_pointer, json());
      if (id.is_number()) {
        return id.get<int>();
      }
      throw ErrorTreeNodeIdInvalid(id);
    }

    void setId(int id) {
      j["/tmp/id"_json_pointer] = id;
    }

    std::map<int, Nucleotide> getMutationsOrSubstitutions(const std::string& what) const {
      const auto path = json::json_pointer{fmt::format("/tmp/{}", what)};
      auto substitutionsObject = j.value(path, json::object());
      std::map<int, Nucleotide> substitutions;
      if (substitutionsObject.is_object()) {
        for (const auto& [posStr, nucJsonStr] : substitutionsObject.items()) {
          const auto pos = parsePosition(posStr);
          const auto nuc = parseNucleotide(nucJsonStr);
          substitutions.insert({pos, nuc});
        }
      }
      return substitutions;
    }

    std::map<int, Nucleotide> substitutions() const {
      return getMutationsOrSubstitutions("substitutions");
    }

    std::map<int, Nucleotide> mutations() const {
      return getMutationsOrSubstitutions("mutations");
    }

    void setMutationsOrSubstitutions(const char* what, const std::map<int, Nucleotide>& data) {
      const auto path = json::json_pointer{fmt::format("/tmp/{}", what)};
      auto obj = json::object();
      for (const auto& [pos, nuc] : data) {
        const auto posStr = std::to_string(pos);
        const auto nucStr = nucToString(nuc);
        obj.emplace(posStr, nucStr);
      }
      j[path] = obj;
    }

    void setMutations(const std::map<int, Nucleotide>& data) {
      return setMutationsOrSubstitutions("mutations", data);
    }

    void setSubstitutions(const std::map<int, Nucleotide>& data) {
      return setMutationsOrSubstitutions("substitutions", data);
    }

    std::vector<NucleotideSubstitution> nucleotideMutations() const {
      try {
        auto nucMutsArray = j.value("/branch_attrs/mutations/nuc", json::array());
        if (!nucMutsArray.is_array()) {
          // TODO: throw an exception
        }

        std::vector<NucleotideSubstitution> result;
        result.reserve(nucMutsArray.size());

        for (const auto& mutStrValue : nucMutsArray) {
          if (!mutStrValue.is_string()) {
            // TODO: throw an exception
          }

          const auto mutStr = mutStrValue.get<std::string>();
          result.emplace_back(parseMutation(mutStr));
        }

        result.shrink_to_fit();
        return result;

      } catch (...) {
        std::cout << "j: " << j << std::endl;
        std::cout.flush();
        fflush(stdout);

        throw;
      }
    }

    void setNucleotideMutationsEmpty() {
      j["/branch_attrs/mutations/nuc"_json_pointer] = json::array();
    }

    std::optional<double> divergence() const {
      const auto div = j.value("/node_attrs/div"_json_pointer, json());
      if (div.is_number()) {
        return div.get<double>();
      }
      return {};
    }

    std::string clade() const {
      const auto clade = j.value(json::json_pointer{"/node_attrs/clade_membership/value"}, json());
      if (!clade.is_string()) {
        throw ErrorTreeNodeCladeInvalid(clade);
      }
      return clade.get<std::string>();
    }

    void setClade(const std::string& clade) {
      j[json::json_pointer{"/node_attrs/clade_membership/value"}] = clade;
    }

    bool isReferenceNode() const {
      const auto nodeType = j.value("/node_attrs/Node Type/value"_json_pointer, json());
      return nodeType.is_string() && (nodeType.get<std::string>() == "Reference");
    }

    bool isLeaf() const {
      const auto childrenValue = j.value("children", json());
      return !childrenValue.is_array() || childrenValue.empty();
    }

    std::string name() const {
      return j.value("name", "");
    }

    void setName(const std::string& name) {
      j["name"] = name;
    }

    void setNodeAttr(const char* name, const char* val) {
      const auto path = json::json_pointer{fmt::format("/node_attrs/{}/value", name)};
      j[path] = val;
    }

    void removeNodeAttr(const char* name) {
      const auto path = json::json_pointer{fmt::format("/node_attrs/{}", name)};
      j.erase(path);
    }

    void removeTemporaries() {
      j.erase("tmp");
    }
  };

  TreeNode::TreeNode(json& json) : pimpl(std::make_unique<TreeNodeImpl>(json)) {}

  TreeNode::TreeNode(TreeNode&& other) noexcept : pimpl(std::move(other.pimpl)) {}

  TreeNode& TreeNode::operator=(TreeNode&& other) noexcept {
    pimpl = std::move(other.pimpl);
    return *this;
  }

  TreeNode::~TreeNode() {}// NOLINT(modernize-use-equals-default)

  TreeNodeArray TreeNode::children() const {
    return pimpl->children();
  }

  TreeNode TreeNode::addChildFromCopy(const TreeNode& node) {
    return pimpl->addChildFromCopy(node);
  }

  TreeNode TreeNode::addChild() {
    return pimpl->addChild();
  }

  std::map<int, Nucleotide> TreeNode::substitutions() const {
    return pimpl->substitutions();
  }

  std::map<int, Nucleotide> TreeNode::mutations() const {
    return pimpl->mutations();
  }

  std::vector<NucleotideSubstitution> TreeNode::nucleotideMutations() const {
    return pimpl->nucleotideMutations();
  }

  void TreeNode::setNucleotideMutationsEmpty() {
    pimpl->setNucleotideMutationsEmpty();
  }

  std::optional<double> TreeNode::divergence() const {
    return pimpl->divergence();
  }

  int TreeNode::id() const {
    return pimpl->id();
  }

  void TreeNode::setId(int id) {
    return pimpl->setId(id);
  }

  std::string TreeNode::clade() const {
    return pimpl->clade();
  }

  void TreeNode::setClade(const std::string& clade) {
    pimpl->setClade(clade);
  }

  bool TreeNode::isReferenceNode() const {
    return pimpl->isReferenceNode();
  }

  bool TreeNode::isLeaf() const {
    return pimpl->isLeaf();
  }

  std::string TreeNode::name() const {
    return pimpl->name();
  }

  void TreeNode::setName(const std::string& name) {
    return pimpl->setName(name);
  }

  void TreeNode::setNodeAttr(const char* name, const char* val) {
    return pimpl->setNodeAttr(name, val);
  }

  void TreeNode::setMutations(const std::map<int, Nucleotide>& data) {
    return pimpl->setMutations(data);
  }

  void TreeNode::setSubstitutions(const std::map<int, Nucleotide>& data) {
    return pimpl->setSubstitutions(data);
  }

  void TreeNode::removeNodeAttr(const char* name) {
    pimpl->removeNodeAttr(name);
  }

  void TreeNode::removeTemporaries() {
    pimpl->removeTemporaries();
  }


  ErrorTreeNodeNotObject::ErrorTreeNodeNotObject(const json& node)
      : std::runtime_error(
          fmt::format("When accessing json node: The node is expected to be an object, but found this instead: \"{}\"",
            node.dump())) {}

  ErrorTreeNodeMutationPositionInvalid::ErrorTreeNodeMutationPositionInvalid(const json& node)
      : std::runtime_error(fmt::format(
          "When accessing Tree Node Mutation position: the position is invalid: Expected a number, but got \"{}\". "
          "This is an internal issue. Please report this to developers, providing data and parameters you used, "
          "in order to replicate the error.",
          node.dump())) {}

  ErrorTreeNodeMutationNucleotideInvalid::ErrorTreeNodeMutationNucleotideInvalid(const json& node)
      : std::runtime_error(fmt::format(
          "When accessing Tree Node Mutation nucleotide: the nucleotide is invalid: \"{}\". This is an internal "
          "issue. Please report this to developers, providing data and parameters you used, in order to replicate "
          "the error.",
          node.dump())) {}

  ErrorTreeNodeIdInvalid::ErrorTreeNodeIdInvalid(const json& node)
      : std::runtime_error(fmt::format(
          "When accessing Tree Node ID: the ID is invalid. Expected a number, but got \"{}\". This is an internal "
          "issue. Please report this to developers, providing data and parameters you used, in order to replicate "
          "the error.",
          node.dump())) {}

  ErrorTreeNodeCladeInvalid::ErrorTreeNodeCladeInvalid(const json& node)
      : std::runtime_error(fmt::format(
          "When accessing clade of the tree node: expected `clade_membership` to be a string, but got \"{}\". Make "
          "sure all reference tree nodes have `clade_membership` field assigned. If you think it's a bug, please "
          "report this to developers, providing data and parameters you used, in order to replicate the error.",
          node.dump())) {}

}// namespace Nextclade
