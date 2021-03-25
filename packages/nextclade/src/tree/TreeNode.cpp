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

  class ErrorTreeNodeNotObject : public std::runtime_error {
  public:
    explicit ErrorTreeNodeNotObject(const json& node)
        : std::runtime_error(fmt::format(
            "When accessing json node: The node is expected to be an object, but found this instead: \"{:s}\"", node)) {
    }
  };

  class ErrorTreeNodeMutationPositionInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeMutationPositionInvalid(const std::string& pos)
        : std::runtime_error(fmt::format(
            "When accessing Tree Node Mutation position: the position is invalid: \"{}\". This is an internal issue. "
            "Please report this to developers, providing data and parameters you used, in order to replicate the "
            "error.",
            pos)) {}
  };

  class ErrorTreeNodeMutationNucleotideInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeMutationNucleotideInvalid(const std::string& nuc)
        : std::runtime_error(fmt::format(
            "When accessing Tree Node Mutation nucleotide: the nucleotide is invalid: \"{}\". This is an internal "
            "issue. Please report this to developers, providing data and parameters you used, in order to replicate "
            "the error.",
            nuc)) {}
  };

  class ErrorTreeNodeIdInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeIdInvalid()
        : std::runtime_error(
            "When accessing Tree Node ID: the ID is invalid. This is an internal issue. Please report this to "
            "developers, providing data and parameters you used, in order to replicate the error.") {}
  };

  class ErrorTreeNodeCladeInvalid : public std::runtime_error {
  public:
    explicit ErrorTreeNodeCladeInvalid()
        : std::runtime_error(
            "When accessing clade of the tree node: the clade is missing or invalid. Make sure all reference tree "
            "nodes have `clade_membership` field assigned. Please report this to "
            "developers, providing data and parameters you used, in order to replicate the error.") {}
  };

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
    json j;

    void ensureIsObject() const {
      if (!j.is_object()) {
        throw ErrorTreeNodeNotObject(j);
      }
    }

  public:
    explicit TreeNodeImpl(json&& json) : j(json) {
      ensureIsObject();
    }

    json getJson() const {
      return j;
    }

    TreeNodeArray children() const {
      auto childrenArray = j.value("children", json::array());
      return TreeNodeArray{childrenArray};
    }

    void addChild(const TreeNode& node) {
      auto childToAdd = node.pimpl->j;
      auto childrenJson = j.value("children", json::array());
      childrenJson.push_back(childToAdd);
    }

    std::map<int, Nucleotide> getMutationsOrSubstitutions(const std::string& path) const {
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
      const auto div = j["/node_attrs/div"_json_pointer];
      if (div.is_number()) {
        return div.get<double>();
      }
      return {};
    }

    int id() const {
      const auto id = j["/node_attrs/id/value"_json_pointer];
      if (id.is_number()) {
        return id.get<int>();
      }
      throw ErrorTreeNodeIdInvalid();
    }

    std::string clade() const {
      const auto clade = j["/node_attrs/clade_membership/value"_json_pointer];
      if (clade.is_string()) {
        return clade.get<std::string>();
      }
      throw ErrorTreeNodeCladeInvalid();
    }

    bool isReferenceNode() const {
      const auto nodeType = j["/node_attrs/Node Type/value"_json_pointer];
      return nodeType.is_string() && (nodeType.get<std::string>() == "Reference");
    }

    bool isLeaf() const {
      const auto childrenValue = j["children"];
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

    void setNodeAttr(const char* name, const std::map<int, Nucleotide>& data) {
      const auto path = json::json_pointer{fmt::format("/node_attrs/{}/value", name)};

      auto obj = json::object();
      for (const auto& [pos, nuc] : data) {
        const auto posStr = std::to_string(pos);
        const auto nucStr = std::to_string(nucToChar(nuc));
        obj.emplace(posStr, nucStr);
      }

      j[path] = obj;
    }

    void setNodeAttr(const char* name, int val) {
      const auto path = json::json_pointer{fmt::format("/node_attrs/{}/value", name)};
      j[path] = val;
    }

    void removeNodeAttr(const char* name) {
      j.erase(name);
    }

    void assign(const TreeNode& node) {
      j.update(node.pimpl->j);// Deep copy
    }
  };

  TreeNode::TreeNode() = default;

  TreeNode::TreeNode(json&& json) : pimpl(std::make_unique<TreeNodeImpl>(std::move(json))) {}

  TreeNode::TreeNode(TreeNode&& other) noexcept : pimpl(std::move(other.pimpl)) {}

  TreeNode& TreeNode::operator=(TreeNode&& other) noexcept {
    pimpl = std::move(other.pimpl);
    return *this;
  }

  TreeNode::~TreeNode() {}// NOLINT(modernize-use-equals-default)

  json TreeNode::getJson() const {
    return pimpl->getJson();
  }

  TreeNodeArray TreeNode::children() const {
    return pimpl->children();
  }

  void TreeNode::addChild(const TreeNode& node) {
    return pimpl->addChild(node);
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

  std::string TreeNode::clade() const {
    return pimpl->clade();
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

  void TreeNode::setNodeAttr(const char* name, const std::map<int, Nucleotide>& data) {
    return pimpl->setNodeAttr(name, data);
  }

  void TreeNode::setNodeAttr(const char* name, int data) {
    return pimpl->setNodeAttr(name, data);
  }

  void TreeNode::removeNodeAttr(const char* name) {
    return pimpl->removeNodeAttr(name);
  }

  /**
   * Performs deep copy assignment of the given node's data to `this` node
   */
  void TreeNode::assign(const TreeNode& node) {
    json j;
    j.update(node.getJson());
    pimpl = std::make_unique<TreeNodeImpl>(std::move(j));
  }

}// namespace Nextclade
