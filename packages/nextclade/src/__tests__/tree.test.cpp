#include "../tree/Tree.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include "../../include/nextclade/nextclade.h"
#include "../../include/nextclade/private/nextclade_private.h"
#include "../tree/TreeNode.h"

// Goes last
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
  EXPECT_THROW(auto node = TreeNode(json()), ErrorTreeNodeNotObject);
}


TEST(Tree, Throws_if_no_required_node_attrs) {
  constexpr auto input = R"(
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
