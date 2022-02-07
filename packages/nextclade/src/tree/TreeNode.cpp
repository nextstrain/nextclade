#include "TreeNode.h"

#include <common/contract.h>
#include <fmt/format.h>
#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <nlohmann/json.hpp>
#include <string>

#include "../../../nextalign/src/alphabet/nucleotides.h"
#include "../io/parseMutation.h"
#include "../utils/concat.h"
#include "../utils/map.h"
#include "../utils/safe_cast.h"

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

    Aminoacid parseAminoacid(const json& aaJsonStr) {
      if (!aaJsonStr.is_string()) {
        throw ErrorTreeNodeMutationAminoacidInvalid(aaJsonStr);
      }

      const auto aaStr = aaJsonStr.get<std::string>();
      if (aaStr.size() != 1) {
        throw ErrorTreeNodeMutationAminoacidInvalid(aaStr);
      }

      return charToAa(aaStr[0]);
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
      std::map<int, Nucleotide> result;
      if (substitutionsObject.is_object()) {
        for (const auto& [posStr, nucJsonStr] : substitutionsObject.items()) {
          const auto pos = parsePosition(posStr);
          const auto nuc = parseNucleotide(nucJsonStr);
          result.insert({pos, nuc});
        }
      }
      return result;
    }

    std::map<int, Nucleotide> substitutions() const {
      ensureIsObject();
      return getMutationsOrSubstitutions("substitutions");
    }

    std::map<int, Nucleotide> mutations() const {
      ensureIsObject();
      return getMutationsOrSubstitutions("mutations");
    }

    std::map<std::string, std::map<int, Aminoacid>> getAaMutationsOrSubstitutions(const std::string& what) const {
      ensureIsObject();

      const auto path = json_pointer{fmt::format("/tmp/{}", what)};
      const auto& aaMutsObj = j[path];
      std::map<std::string, std::map<int, Aminoacid>> result;
      if (aaMutsObj.is_object()) {
        for (const auto& [geneName, aaMutsForGeneObj] : aaMutsObj.items()) {
          if (!aaMutsForGeneObj.is_object()) {
            continue;
          }

          for (const auto& [posStr, aaJsonStr] : aaMutsForGeneObj.items()) {
            const auto pos = parsePosition(posStr);
            const auto aa = parseAminoacid(aaJsonStr);
            result[geneName][pos] = aa;
          }
        }
      }
      return result;
    }

    std::map<std::string, std::map<int, Aminoacid>> aaSubstitutions() const {
      return getAaMutationsOrSubstitutions("aaSubstitutions");
    }

    std::map<std::string, std::map<int, Aminoacid>> aaMutations() const {
      return getAaMutationsOrSubstitutions("aaMutations");
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

    void setAaMutationsOrSubstitutions(const std::string& what,
      const std::map<std::string, std::map<int, Aminoacid>>& data) {
      ensureIsObject();

      const auto path = json_pointer{fmt::format("/tmp/{}", what)};
      auto geneObj = json::object();
      for (const auto& [geneName, muts] : data) {
        auto mutObj = json::object();
        for (const auto& [pos, aa] : muts) {
          const auto posStr = std::to_string(pos);
          const auto nucStr = aaToString(aa);
          mutObj.emplace(posStr, nucStr);
        }
        geneObj[geneName] = mutObj;
      }
      j[path] = geneObj;
    }

    void setAaMutations(const std::map<std::string, std::map<int, Aminoacid>>& aaMutationMap) {
      return setAaMutationsOrSubstitutions("aaMutations", aaMutationMap);
    }

    void setAaSubstitutions(const std::map<std::string, std::map<int, Aminoacid>>& aaSubstitutionMap) {
      return setAaMutationsOrSubstitutions("aaSubstitutions", aaSubstitutionMap);
    }

    safe_vector<NucleotideSubstitution> nucleotideMutations() const {
      ensureIsObject();

      const auto path = json_pointer{"/branch_attrs/mutations/nuc"};

      if (!j.contains(path)) {
        return {};
      }

      auto nucMutsArray = j.at(path);
      if (!nucMutsArray.is_array()) {
        // TODO: throw an exception
      }

      safe_vector<NucleotideSubstitution> result;
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

    std::map<std::string, safe_vector<AminoacidSubstitutionWithoutGene>> aminoacidMutations() {
      ensureIsObject();

      const auto path = json_pointer{"/branch_attrs/mutations"};

      if (!j.contains(path)) {
        return {};
      }

      auto aaMuts = j.at(path);
      if (!aaMuts.is_object()) {
        return {};
      }

      std::map<std::string, safe_vector<AminoacidSubstitutionWithoutGene>> result;
      for (const auto& [geneName, aaMutsForGene] : aaMuts.items()) {
        if (geneName == "nuc") {
          continue;
        }

        for (const auto& mutStrValue : aaMutsForGene) {
          if (!mutStrValue.is_string()) {
            return {};
          }
          const auto mutStr = mutStrValue.get<std::string>();
          result[geneName].emplace_back(parseAminoacidMutationWithoutGene(mutStr));
        }
      }
      return result;
    }

    void setNucleotideMutationsEmpty() {
      ensureIsObject();
      j[json_pointer{"/branch_attrs/mutations/nuc"}] = json::array();
    }

    void setBranchAttrAaMutations(                                       //
      const PrivateNucleotideMutations& nucMutations,                    //
      const std::map<std::string, PrivateAminoacidMutations>& aaMutations//
    ) {
      auto mutObj = json::object();

      // Merge nuc subs and dels and sort them in unison
      const auto delsAsSubs = map_vector<NucleotideDeletionSimple, NucleotideSubstitutionSimple>(
        nucMutations.privateDeletions, convertDelToSub<Nucleotide>);
      auto allNucMutations = merge(nucMutations.privateSubstitutions, delsAsSubs);
      std::sort(allNucMutations.begin(), allNucMutations.end());

      for (const auto& mut : allNucMutations) {
        mutObj["nuc"].push_back(formatMutationSimple(mut));
      }

      for (const auto& [geneName, aaMutationsForGene] : aaMutations) {
        const auto& privateAaSubstitutions = aaMutationsForGene.privateSubstitutions;
        const auto& privateAaDeletions = aaMutationsForGene.privateDeletions;
        const int totalPrivateAaMutations = safe_cast<int>(privateAaSubstitutions.size() + privateAaDeletions.size());

        if (totalPrivateAaMutations == 0) {
          continue;
        }

        if (!mutObj.contains(geneName)) {
          mutObj[geneName] = json::array();
        }


        // Merge aa subs and dels and sort them in unison
        const auto aaDelsAsSubs = map_vector<AminoacidDeletionSimple, AminoacidSubstitutionSimple>(privateAaDeletions,
          convertDelToSub<Aminoacid>);
        auto allAaMutations = merge(privateAaSubstitutions, aaDelsAsSubs);
        std::sort(allAaMutations.begin(), allAaMutations.end());

        for (const auto& mut : allAaMutations) {
          mutObj[geneName].push_back(formatAminoacidMutationSimpleWithoutGene(mut));
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

    std::map<std::string, std::string> customNodeAttributes(const safe_vector<std::string>& customNodeAttrKeys) const {
      ensureIsObject();

      std::map<std::string, std::string> attrs;
      for (const auto& key : customNodeAttrKeys) {
        const auto& jptr = json_pointer{fmt::format("/node_attrs/{}/value", key)};
        if (!j.contains(jptr)) {
          continue;
        }

        const auto value = j.value(jptr, json());
        if (value.is_string()) {
          attrs.insert({key, value.get<std::string>()});
        }
      }

      return attrs;
    }

    void setCustomNodeAttributes(const std::map<std::string, std::string>& attrs) {
      ensureIsObject();
      for (const auto& [key, value] : attrs) {
        setNodeAttr(key, value);
      }
    }

    bool isReferenceNode() const {
      ensureIsObject();

      const auto path = json_pointer{"/node_attrs/Node type/value"};

      if (!j.contains(path)) {
        throw ErrorTreeNodeTypeMissing();
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

  std::map<std::string, std::map<int, Aminoacid>> TreeNode::aaSubstitutions() const {
    return pimpl->aaSubstitutions();
  }

  std::map<std::string, std::map<int, Aminoacid>> TreeNode::aaMutations() const {
    return pimpl->aaMutations();
  }

  safe_vector<NucleotideSubstitution> TreeNode::nucleotideMutations() const {
    return pimpl->nucleotideMutations();
  }

  std::map<std::string, safe_vector<AminoacidSubstitutionWithoutGene>> TreeNode::aminoacidMutations() const {
    return pimpl->aminoacidMutations();
  }

  void TreeNode::setMutations(const std::map<int, Nucleotide>& data) {
    return pimpl->setMutations(data);
  }

  void TreeNode::setSubstitutions(const std::map<int, Nucleotide>& data) {
    return pimpl->setSubstitutions(data);
  }

  void TreeNode::setAaMutations(const std::map<std::string, std::map<int, Aminoacid>>& aaMutationMap) {
    return pimpl->setAaMutations(aaMutationMap);
  }

  void TreeNode::setAaSubstitutions(const std::map<std::string, std::map<int, Aminoacid>>& aaSubstitutionMap) {
    return pimpl->setAaSubstitutions(aaSubstitutionMap);
  }

  void TreeNode::setNucleotideMutationsEmpty() {
    pimpl->setNucleotideMutationsEmpty();
  }

  void TreeNode::setBranchAttrMutations(const PrivateNucleotideMutations& nucMutations,
    const std::map<std::string, PrivateAminoacidMutations>& aaMutations) {
    pimpl->setBranchAttrAaMutations(nucMutations, aaMutations);
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

  std::map<std::string, std::string> TreeNode::customNodeAttributes(
    const safe_vector<std::string>& customNodeAttrKeys) const {
    return pimpl->customNodeAttributes(customNodeAttrKeys);
  }

  void TreeNode::setCustomNodeAttributes(const std::map<std::string, std::string>& attrs) const {
    pimpl->setCustomNodeAttributes(attrs);
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

  void TreeNode::removeNodeAttr(const std::string& name) {
    pimpl->removeNodeAttr(name);
  }

  void TreeNode::removeTemporaries() {
    pimpl->removeTemporaries();
  }


  ErrorTreeNodeNotObject::ErrorTreeNodeNotObject(const json& node)
      : ErrorFatal(
          fmt::format("When accessing json node: The node is expected to be an object, but found this instead: \"{}\"",
            node.dump())) {}

  ErrorTreeNodeMutationPositionInvalid::ErrorTreeNodeMutationPositionInvalid(const json& node)
      : ErrorFatal(fmt::format(
          "When accessing Tree Node Mutation position: the position is invalid: Expected a number, but got \"{}\". "
          "This is an internal issue. Please report this to developers, providing data and parameters you used, "
          "in order to replicate the error.",
          node.dump())) {}

  ErrorTreeNodeMutationNucleotideInvalid::ErrorTreeNodeMutationNucleotideInvalid(const json& node)
      : ErrorFatal(fmt::format(
          "When accessing Tree Node Mutation nucleotide: the nucleotide is invalid: \"{}\". This is an internal "
          "issue. Please report this to developers, providing data and parameters you used, in order to replicate "
          "the error.",
          node.dump())) {}

  ErrorTreeNodeMutationAminoacidInvalid::ErrorTreeNodeMutationAminoacidInvalid(const json& node)
      : ErrorFatal(fmt::format(
          "When accessing Tree Node Mutation aminoacid: the aminoacid is invalid: \"{}\". This is an internal "
          "issue. Please report this to developers, providing data and parameters you used, in order to replicate "
          "the error.",
          node.dump())) {}

  ErrorTreeNodeIdInvalid::ErrorTreeNodeIdInvalid(const json& node)
      : ErrorFatal(fmt::format(
          "When accessing Tree Node ID: the ID is invalid. Expected a number, but got \"{}\". This is an internal "
          "issue. Please report this to developers, providing data and parameters you used, in order to replicate "
          "the error.",
          node.dump())) {}

  ErrorTreeNodeCladeInvalid::ErrorTreeNodeCladeInvalid(const json& node)
      : ErrorFatal(fmt::format(
          "When accessing clade of the tree node: expected `clade_membership` to be a string, but got \"{}\". Make "
          "sure all reference tree nodes have `clade_membership` field assigned. If you think it's a bug, please "
          "report this to developers, providing data and parameters you used, in order to replicate the error.",
          node.dump())) {}

  ErrorTreeNodeTypeMissing::ErrorTreeNodeTypeMissing()
      : ErrorFatal(
          "When accessing Tree Node type: the Node type is missing. This is an internal issue. Please report this to "
          "developers, providing data and parameters you used, in order to replicate the error.") {}

  ErrorTreeNodeTypeInvalid::ErrorTreeNodeTypeInvalid(const json& node)
      : ErrorFatal(fmt::format(
          "When accessing Tree Node type: the type is invalid. Expected a string, one of {{ \"Reference\", \"New\" }},"
          "but got \"{}\". This is an internal issue. Please report this to developers, providing data and parameters "
          "you used, in order to replicate the error.",
          node.dump())) {}
}// namespace Nextclade
