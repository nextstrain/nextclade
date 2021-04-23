#include "../tree/Tree.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include "../../include/nextclade/nextclade.h"
#include "../../include/nextclade/private/nextclade_private.h"
#include "../tree/TreeNode.h"

// Goes last
#include <fstream>
#include <nlohmann/json.hpp>

#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected))
#define EXPECT_MAP_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ContainerEq(expected))

namespace {
  using json = nlohmann::ordered_json;

  using ::Nextclade::Tree;
  using ::Nextclade::TreeNode;

  using Nextclade::ErrorAuspiceJsonV2TreeNotFound;
  using Nextclade::ErrorTreeNodeCladeInvalid;
  using Nextclade::ErrorTreeNodeIdInvalid;
  using Nextclade::ErrorTreeNodeMutationNucleotideInvalid;
  using Nextclade::ErrorTreeNodeMutationPositionInvalid;
  using Nextclade::ErrorTreeNodeNotObject;

}// namespace


TEST(Tree, Sets_and_gets_id) {
  auto tree = Tree(R"(
    {
      "tree": {
       }
    }
  )");

  auto node = tree.root();
  node.setId(789);
  EXPECT_EQ(789, node.id());
}

TEST(Tree, Sets_and_gets_mutations) {
  auto tree = Tree(R"(
    {
      "tree": {
       }
    }
  )");

  auto node = tree.root();

  const std::map<int, Nucleotide> mutations = {
    {123, Nucleotide::C},
    {456, Nucleotide::A},
  };

  node.setMutations(mutations);
  const auto result = node.mutations();

  EXPECT_MAP_EQ(mutations, result);
}

TEST(Tree, Sets_and_gets_substitutions) {
  auto tree = Tree(R"(
    {
      "tree": {
       }
    }
  )");

  auto node = tree.root();

  const std::map<int, Nucleotide> substitutions = {
    {123, Nucleotide::C},
    {456, Nucleotide::A},
  };

  node.setSubstitutions(substitutions);
  const auto result = node.substitutions();

  EXPECT_MAP_EQ(substitutions, result);
}

TEST(Tree, Sets_clade) {
  auto tree = Tree(R"(
    {
      "tree": {
       }
    }
  )");

  const std::string clade = "20A";
  auto node = tree.root();
  node.setClade(clade);

  const std::string expected = R"(
    {
      "tree": {
          "node_attrs": {
            "clade_membership": { "value": "20A" }
          }
       }
    }
  )"_json.dump(2);

  EXPECT_EQ(expected, tree.serialize());
}

TEST(Tree, Sets_and_gets_clade) {
  auto tree = Tree(R"(
    {
      "tree": {
       }
    }
  )");

  const std::string clade = "20A.EU1";
  auto node = tree.root();
  node.setClade(clade);
  EXPECT_EQ(clade, node.clade());
}

TEST(Tree, Sets_divergence) {
  auto tree = Tree(R"(
    {
      "tree": {
       }
    }
  )");

  auto node = tree.root();
  node.setDivergence(3.14);

  const std::string expected = R"(
    {
      "tree": {
          "node_attrs": {
            "div": 3.14
          }
       }
    }
  )"_json.dump(2);

  EXPECT_EQ(expected, tree.serialize());
}

TEST(Tree, Sets_and_gets_divergence) {
  auto tree = Tree(R"(
    {
      "tree": {
       }
    }
  )");

  const double div = 3.14;
  auto node = tree.root();
  node.setDivergence(div);
  EXPECT_EQ(div, node.divergence());
}

TEST(Tree, Gets_empty_divergence) {
  auto tree = Tree(R"(
    {
      "tree": {
       }
    }
  )");

  auto node = tree.root();
  EXPECT_EQ(std::optional<double>{}, node.divergence());
}


TEST(Tree, Children_get) {
  auto tree = Tree(R"(
    {
      "tree": {
         "children": [
            { "tmp": { "id": 123 } },
            { "tmp": { "id": 894 } },
            { "tmp": { "id": 42  } },
            { "tmp": { "id": 67  } }
          ]
       }
    }
  )");

  constexpr std::array<int, 4> ids = {123, 894, 42, 67};

  auto node = tree.root();

  int i = 0;
  node.forEachChildNode([&i, &ids](const auto& child) {
    EXPECT_EQ(ids[i], child.id());// NOLINT(cppcoreguidelines-pro-bounds-constant-array-index)
    ++i;
  });
}

TEST(Tree, Children_add) {
  auto tree = Tree(R"(
    {
      "tree": {
         "children": [
            { "tmp": { "id": 123 } }
         ]
       }
    }
  )");

  auto node = tree.root();
  auto child = node.addChild();
  child.setId(456);

  auto treeExpected = Tree(R"(
    {
      "tree": {
         "children": [
            { "tmp": { "id": 123 }, "foo": "bar" },
            { "tmp": { "id": 456 }, "foo": "bar" }
         ]
       }
    }
  )");
}

TEST(Tree, Children_add_from_copy) {
  auto tree = Tree(R"(
    {
      "tree": {
          "children": [
            { "tmp": { "id": 123 }, "foo": "bar" }
          ]
       }
    }
  )");

  auto tree2 = Tree(R"(
    {
      "tree": { "tmp": { "id": 456 }, "foo": "baz" }
    }
  )");

  auto treeExpected = Tree(R"(
    {
      "tree": {
         "children": [
            { "tmp": { "id": 789 }, "foo": "baz" },
            { "tmp": { "id": 123 }, "foo": "bar" }
         ]
       }
    }
  )");

  auto node = tree.root();
  auto node2 = tree2.root();
  auto child = node.addChildFromCopy(node2);
  child.setId(789);

  EXPECT_EQ(treeExpected.serialize(), tree.serialize());
}


TEST(Tree, Throws_if_no_tree) {
  constexpr auto input = R"(
    {
      "NO_TREE_HERE": {}
    }
  )";

  auto tree = Tree(input);

  EXPECT_THROW(tree.root(), ErrorAuspiceJsonV2TreeNotFound);
}

TEST(Tree, Throws_if_node_is_not_object) {
  json j = json();
  EXPECT_THROW(auto node = TreeNode{j}, ErrorTreeNodeNotObject);
}

TEST(Tree, Throws_if_no_required_node_attrs) {
  const std::string input = R"(
    {
      "tree": {
          "node_attrs": "SO_WROONG"
       }
    }
  )";

  auto tree = Tree(input);
  auto node = tree.root();

  EXPECT_THROW(node.id(), ErrorTreeNodeIdInvalid);
  EXPECT_THROW(node.clade(), ErrorTreeNodeCladeInvalid);
}

TEST(Tree, Throws_if_mutations_pos_invalid) {
  auto tree = Tree(R"(
    {
      "tree": {
          "tmp": {
            "mutations": { "INVALID": "C" },
            "substitutions": { "456": "A" }
          }
       }
    }
  )");
  auto node = tree.root();
  EXPECT_THROW(node.mutations(), ErrorTreeNodeMutationPositionInvalid);
}

TEST(Tree, Throws_if_mutations_nuc_invalid) {
  auto tree = Tree(R"(
    {
      "tree": {
          "tmp": {
            "mutations": { "123": "INVALID" },
            "substitutions": { "456": "A" }
          }
       }
    }
  )");
  auto node = tree.root();
  EXPECT_THROW(node.mutations(), ErrorTreeNodeMutationNucleotideInvalid);
}

TEST(Tree, Throws_if_substitutions_pos_invalid) {
  auto tree = Tree(R"(
    {
      "tree": {
          "tmp": {
            "mutations": { "123": "C" },
            "substitutions": { "INVALID": "A" }
          }
       }
    }
  )");
  auto node = tree.root();
  EXPECT_THROW(node.substitutions(), ErrorTreeNodeMutationPositionInvalid);
}

TEST(Tree, Throws_if_substitutions_nuc_invalid) {
  auto tree = Tree(R"(
    {
      "tree": {
          "tmp": {
            "mutations": { "123": "C" },
            "substitutions": { "456": "INVALID" }
          }
       }
    }
  )");
  auto node = tree.root();
  EXPECT_THROW(node.substitutions(), ErrorTreeNodeMutationNucleotideInvalid);
}
