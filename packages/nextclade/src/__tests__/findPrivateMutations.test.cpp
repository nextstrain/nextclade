#include <fmt/format.h>
#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include <exception>
#include <fstream>

#include "../../include/nextclade/nextclade.h"
#include "../../include/nextclade/private/nextclade_private.h"
#include "../../src/io/parseMutation.h"
#include "../../src/tree/treeFindNearestNodes.h"


#define EXPECT_ARR_EQ_UNORDERED(expected, actual) ASSERT_THAT(actual, ::testing::UnorderedElementsAreArray(expected))

namespace {
  using Nextclade::AnalysisResult;
  using Nextclade::NucleotideSubstitution;
  using Nextclade::Tree;
  using Nextclade::TreeNode;

  using Nextclade::findPrivateMutations;
  using Nextclade::parseMutation;


  class FindPrivateMutations : public ::testing::Test {
  protected:
    NucleotideSequence rootSeq;

    NucleotideSequence parseRefFastaFile(const std::string& filename) {
      std::ifstream file(filename);
      if (!file.good()) {
        throw std::runtime_error(fmt::format("Error: unable to read \"{:s}\"\n", filename));
      }

      const auto refSeqs = parseSequences(file, filename);
      if (refSeqs.size() != 1) {
        throw std::runtime_error(
          fmt::format("Error: {:d} sequences found in reference sequence file, expected 1", refSeqs.size()));
      }

      const auto& refSeq = refSeqs.front();
      return toNucleotideSequence(refSeq.seq);
    }

    FindPrivateMutations() {
      rootSeq = parseRefFastaFile("data/sars-cov-2/reference.fasta");
    }

    TreeNode makeRef(Tree& tree, const std::vector<std::string>& substitutions) {


      auto node = tree.root();

      std::map<int, Nucleotide> substitutionsMap;
      for (const auto& sub : substitutions) {
        const auto mut = parseMutation(sub);
        substitutionsMap.insert(std::make_pair(mut.pos, mut.queryNuc));
      }
      node.setSubstitutions(substitutionsMap);

      return node;
    }

    std::vector<NucleotideSubstitution> makeMutList(const std::vector<std::string>& substitutions) {
      std::vector<NucleotideSubstitution> muts;
      for (const auto& sub : substitutions) {
        const auto mut = parseMutation(sub);
        muts.emplace_back(mut);
      }
      return muts;
    }

    AnalysisResult makeQuery(const std::vector<std::string>& substitutions) {
      return AnalysisResult{.substitutions = makeMutList(substitutions)};
    }
  };
}// namespace


TEST_F(FindPrivateMutations, Returns_Empty_If_No_Mutations) {
  auto tree = Tree(R"({ "tree": {} })");
  Nextclade::TreeNode node = makeRef(tree, {/* no mutations in ref node */});
  Nextclade::AnalysisResult seq = makeQuery({/* no mutations in query seq */});
  const auto actual = findPrivateMutations(node, seq, rootSeq);
  const auto expected = makeMutList({});
  EXPECT_ARR_EQ_UNORDERED(actual, expected);
}

TEST_F(FindPrivateMutations, Returns_Empty_If_Matching_Single_Element) {
  auto tree = Tree(R"({ "tree": {} })");
  Nextclade::TreeNode node = makeRef(tree, {"A123C"});
  Nextclade::AnalysisResult seq = makeQuery({"A123C"});
  const auto actual = findPrivateMutations(node, seq, rootSeq);
  const auto expected = makeMutList({});
  EXPECT_ARR_EQ_UNORDERED(actual, expected);
}

TEST_F(FindPrivateMutations, Returns_Empty_If_Same_muts) {
  auto tree = Tree(R"({ "tree": {} })");
  const auto muts = std::vector<std::string>{"A123C", "T456C", "A789G"};
  Nextclade::TreeNode node = makeRef(tree, muts);
  Nextclade::AnalysisResult seq = makeQuery(muts);
  const auto actual = findPrivateMutations(node, seq, rootSeq);
  const auto expected = makeMutList({});
  EXPECT_ARR_EQ_UNORDERED(actual, expected);
}

TEST_F(FindPrivateMutations, Returns_Query_Muts_For_Disjoint_Sets) {
  auto tree = Tree(R"({ "tree": {} })");
  Nextclade::TreeNode node = makeRef(tree, {"A123C", "T456C", "A789G"});
  const auto queryMuts = std::vector<std::string>{{"A123G", "T147C", "A258G"}};
  Nextclade::AnalysisResult seq = makeQuery(queryMuts);
  const auto actual = findPrivateMutations(node, seq, rootSeq);
  const auto expected = makeMutList(queryMuts);
  EXPECT_ARR_EQ_UNORDERED(actual, expected);
}

TEST_F(FindPrivateMutations, Returns_Set_Difference_In_General_Case) {
  auto tree = Tree(R"({ "tree": {} })");

  Nextclade::TreeNode node = makeRef(tree,//
    {
      "C567C",
      "C123A",
      "C45874Y",
      "C45875A",
      "C333Y",
      "C111B",
      "C679N",
    });

  Nextclade::AnalysisResult seq = makeQuery(//
    {
      "C679Y",
      "C123B",
      "C567C",
      "C45875Y",
    });

  const auto expected = makeMutList(//
    {
      "C123B",
      "C679Y",
      "C45875Y",
    });

  const auto actual = findPrivateMutations(node, seq, rootSeq);

  EXPECT_ARR_EQ_UNORDERED(actual, expected);
}
