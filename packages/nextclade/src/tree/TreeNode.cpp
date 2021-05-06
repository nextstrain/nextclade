#include "TreeNode.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <iostream>
#include <nlohmann/json.hpp>
#include <string>

#include "../../../nextalign/src/alphabet/nucleotides.h"
#include "../io/parseMutation.h"
#include "../utils/contract.h"

namespace Nextclade {
  using json_pointer = json::json_pointer;

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

    const json& getChildren() const {
      ensureIsObject();

      auto& childrenArray = j["children"];
      if (!childrenArray.is_array()) {
        j["children"] = json::array();
        childrenArray = j["children"];
      }

      return childrenArray;
    }

    json& getChildren() {
      ensureIsObject();

      auto& childrenArray = j["children"];
      if (!childrenArray.is_array()) {
        j["children"] = json::array();
        childrenArray = j["children"];
      }

      return childrenArray;
    }

  public:
    explicit TreeNodeImpl(json& js) : j(js) {
      ensureIsObject();
    }

    TreeNode addChildFromCopy(const TreeNode& node) {
      ensureIsObject();

      auto nodeCopy = json::object();
      nodeCopy.merge_patch(node.pimpl->j);// Deep clone

      if (!j.contains("children")) {
        j["children"] = json::array();
      }

      auto& childrenArray = j.at("children");
      childrenArray.insert(childrenArray.begin(), {json::object()});
      auto& childJson = childrenArray.at(0);
      childJson.merge_patch(nodeCopy);

      return TreeNode{childJson};
    }

    void assign(const TreeNode& node) {
      j.update(node.pimpl->j);// Deep clone
    }

    TreeNode addChild() {
      ensureIsObject();

      if (!j.contains("children")) {
        j["children"] = json::array();
      }

      auto& childrenArray = j.at("children");
      childrenArray.insert(childrenArray.begin(), {json::object()});
      auto& childJson = childrenArray.at(0);
      return TreeNode{childJson};
    }

    void forEachChildNode(const std::function<void(const TreeNode&)>& action, TreeNode::const_tag) const {
      ensureIsObject();
      if (isLeaf()) {
        return;
      }

      const auto& childrenArray = getChildren();
      for (const auto& elem : childrenArray) {
        json copy;
        copy.update(elem);
        TreeNode node{copy};
        action(node);
      }
    }

    void forEachChildNode(const std::function<void(TreeNode&)>& action) {
      if (isLeaf()) {
        return;
      }

      auto& childrenArray = getChildren();
      for (auto& elem : childrenArray) {
        TreeNode candidate{elem};
        action(candidate);
      }
    }

    int id() const {
      ensureIsObject();

      const auto id = j.value(json_pointer{"/tmp/id"}, json());
      if (id.is_number()) {
        return id.get<int>();
      }
      throw ErrorTreeNodeIdInvalid(id);
    }

    void setId(int id) {
      ensureIsObject();

      j[json_pointer{"/tmp/id"}] = id;
    }

    std::map<int, Nucleotide> getMutationsOrSubstitutions(const std::string& what) const {
      ensureIsObject();

      const auto path = json_pointer{fmt::format("/tmp/{}", what)};
      const auto& substitutionsObject = j[path];
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
      ensureIsObject();
      return getMutationsOrSubstitutions("substitutions");
    }

    std::map<int, Nucleotide> mutations() const {
      ensureIsObject();
      return getMutationsOrSubstitutions("mutations");
    }

    void setMutationsOrSubstitutions(const std::string& what, const std::map<int, Nucleotide>& data) {
      ensureIsObject();
      const auto path = json_pointer{fmt::format("/tmp/{}", what)};
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
      ensureIsObject();

      const auto path = json_pointer{"/branch_attrs/mutations/nuc"};

      if (!j.contains(path)) {
        return {};
      }

      auto nucMutsArray = j.at(path);
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
    }

    void setNucleotideMutations() {
      ensureIsObject();
      j[json_pointer{"/branch_attrs/mutations/nuc"}] = json::array();
    }

    void setNucleotideMutationsEmpty() {
      ensureIsObject();
      j[json_pointer{"/branch_attrs/mutations/nuc"}] = json::array();
    }

    void setBranchAttrMutations(const std::map<std::string, std::vector<std::string>>& mutations) {
      auto mutObj = json::object();

      for (const auto& [gene, muts] : mutations) {
        if (!muts.empty()) {
          if (!mutObj.contains(gene)) {
            mutObj[gene] = json::array();
          }
          for (const auto& mut : muts) {
            mutObj[gene].push_back(mut);
          }
        }
      }

      if (!mutObj.empty()) {
        j[json_pointer{"/branch_attrs/mutations"}] = std::move(mutObj);
      }
    }

    std::optional<double> divergence() const {
      ensureIsObject();
      const auto div = j.value(json_pointer{"/node_attrs/div"}, json());
      if (div.is_number()) {
        return std::make_optional(div.get<double>());
      }
      return {};
    }

    void setDivergence(double div) {
      ensureIsObject();
      j[json_pointer{"/node_attrs/div"}] = div;
    }

    std::string clade() const {
      ensureIsObject();
      const auto clade = j.value(json_pointer{"/node_attrs/clade_membership/value"}, json());
      if (!clade.is_string()) {
        throw ErrorTreeNodeCladeInvalid(clade);
      }
      return clade.get<std::string>();
    }

    void setClade(const std::string& clade) {
      ensureIsObject();
      j[json_pointer{"/node_attrs/clade_membership/value"}] = clade;
    }

    bool isReferenceNode() const {
      ensureIsObject();

      const auto path = json_pointer{"/node_attrs/Node type/value"};

      if (!j.contains(path)) {
        throw ErrorTreeNodeTypeInvalid(j);
      }

      const auto& nodeType = j.at(path);

      if (!nodeType.is_string()) {
        throw ErrorTreeNodeTypeInvalid(nodeType);
      }

      const auto isReference = nodeType.get<std::string>() == "Reference";
      const auto isNew = nodeType.get<std::string>() == "New";

      if (!isReference && !isNew) {
        throw ErrorTreeNodeTypeInvalid(nodeType);
      }

      return isReference;
    }

    void setNodeType(const std::string& nodeType) {
      j[json_pointer{"/node_attrs/Node type/value"}] = nodeType;
    }

    bool isLeaf() const {
      ensureIsObject();
      return !j.contains("children");
    }

    std::string name() const {
      ensureIsObject();
      return j.value("name", "");
    }

    void setName(const std::string& name) {
      ensureIsObject();
      j["name"] = name;
    }

    void setNodeAttr(const std::string& name, const std::string& val) {
      const auto path = json_pointer{fmt::format("/node_attrs/{}/value", name)};
      j[path] = val;
    }

    void removeNodeAttr(const std::string& name) {
      ensureIsObject();
      const auto path = json_pointer{fmt::format("/node_attrs/{}", name)};
      if (j.contains(path)) {
        j.at("node_attrs").erase(name);
      }
      postcondition(!j.contains(path));
    }

    void removeTemporaries() {
      ensureIsObject();
      j.erase("tmp");
    }
  };

  TreeNode::TreeNode(json& js) : pimpl(std::make_shared<TreeNodeImpl>(js)) {}


  TreeNode TreeNode::addChildFromCopy(const TreeNode& node) {
    return pimpl->addChildFromCopy(node);
  }

  void TreeNode::assign(const TreeNode& node) {
    pimpl->assign(node);
  }

  TreeNode TreeNode::addChild() {
    return pimpl->addChild();
  }

  void TreeNode::forEachChildNode(const std::function<void(const TreeNode&)>& action) const {
    pimpl->forEachChildNode(action, TreeNode::const_tag{});
  }

  void TreeNode::forEachChildNode(const std::function<void(TreeNode&)>& action) {
    pimpl->forEachChildNode(action);
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

  void TreeNode::setBranchAttrMutations(const std::map<std::string, std::vector<std::string>>& mutations) {
    pimpl->setBranchAttrMutations(mutations);
  }

  std::optional<double> TreeNode::divergence() const {
    return pimpl->divergence();
  }

  void TreeNode::setDivergence(double div) {
    pimpl->setDivergence(div);
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

  void TreeNode::setNodeType(const std::string& nodeType) {
    pimpl->setNodeType(nodeType);
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

  void TreeNode::setNodeAttr(const std::string& name, const std::string& val) {
    return pimpl->setNodeAttr(name, val);
  }

  void TreeNode::setMutations(const std::map<int, Nucleotide>& data) {
    return pimpl->setMutations(data);
  }

  void TreeNode::setSubstitutions(const std::map<int, Nucleotide>& data) {
    return pimpl->setSubstitutions(data);
  }

  void TreeNode::removeNodeAttr(const std::string& name) {
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

  ErrorTreeNodeTypeInvalid::ErrorTreeNodeTypeInvalid(const json& node)
      : std::runtime_error(fmt::format(
          "When accessing Tree Node type: the type is invalid. Expected a string, one of { \"Reference\", \"New\" },"
          "but got \"{}\". This is an internal issue. Please report this to developers, providing data and parameters "
          "you used, in order to replicate the error.",
          node.dump())) {}
}// namespace Nextclade
