//#include "../../src/tree/findPrivateNucMutations.h"
//
//#include <fmt/format.h>
//#include <gmock/gmock.h>
//#include <gtest/gtest.h>
//
//#include <exception>
//#include <fstream>
//#include <map>
//
//#include "../../include/nextclade/nextclade.h"
//#include "../../src/io/parseMutation.h"
//#include "../../src/tree/Tree.h"
//#include "../../src/tree/TreeNode.h"
//#include "../../src/tree/treePreprocess.h"
//
//
//#define EXPECT_ARR_EQ_UNORDERED(expected, actual) ASSERT_THAT(actual, ::testing::UnorderedElementsAreArray(expected))
//
//namespace {
//  using Nextclade::AnalysisResult;
//  using Nextclade::NucleotideSubstitution;
//  using Nextclade::Tree;
//  using Nextclade::TreeNode;
//
//  using Nextclade::findPrivateNucMutations;
//  using Nextclade::parseMutation;
//
//  class FindPrivateNucMutations : public ::testing::Test {
//  protected:
//    NucleotideSequence rootSeq;
//    Nextclade::Tree tree{R"({ "tree": {} })"};
//
//    NucleotideSequence parseRefFastaFile(const std::string& filename) {
//      std::ifstream file(filename);
//      if (!file.good()) {
//        throw std::runtime_error(fmt::format("Error: unable to read \"{:s}\"\n", filename));
//      }
//
//      const auto refSeqs = parseSequences(file, filename);
//      if (refSeqs.size() != 1) {
//        throw std::runtime_error(
//          fmt::format("Error: {:d} sequences found in reference sequence file, expected 1", refSeqs.size()));
//      }
//
//      const auto& refSeq = refSeqs.front();
//      return toNucleotideSequence(refSeq.seq);
//    }
//
//    FindPrivateNucMutations() {
//      rootSeq = parseRefFastaFile("data/sars-cov-2/reference.fasta");
//    }
//
//    std::map<int, Nucleotide> makeNodeMap(const std::vector<std::string>& substitutions) {
//      auto node = tree.root();
//      node.setSubstitutions();
//      return mapNucleotideMutations(node, rootSeq, std::map<int, Nucleotide>{});
//    }
//
//    std::vector<NucleotideSubstitution> makeMutList(const std::vector<std::string>& substitutions) {
//      std::vector<NucleotideSubstitution> muts;
//      for (const auto& sub : substitutions) {
//        const auto mut = parseMutation(sub);
//        muts.emplace_back(mut);
//      }
//      return muts;
//    }
//
//    AnalysisResult makeQuery(const std::vector<std::string>& substitutions) {
//      return AnalysisResult{.substitutions = makeMutList(substitutions)};
//    }
//  };
//}// namespace
//
//
//TEST_F(FindPrivateNucMutations, Returns_Empty_If_No_Mutations) {
//  TreeNode node = makeNodeMap({/* no mutations in ref node */});
//  AnalysisResult seq = makeQuery({/* no mutations in query seq */});
//  const auto actual = findPrivateNucMutations(nodeMutMap, seq, rootSeq);
//  const auto expected = makeMutList({});
//  EXPECT_ARR_EQ_UNORDERED(actual, expected);
//}
//
//TEST_F(FindPrivateNucMutations, Returns_Empty_If_Matching_Single_Element) {
//  auto tree = Tree(R"({ "tree": {} })");
//  TreeNode node = makeNodeMap(tree, {"A123C"});
//  AnalysisResult seq = makeQuery({"A123C"});
//  const auto actual = findPrivateNucMutations(node, seq, rootSeq);
//  const auto expected = makeMutList({});
//  EXPECT_ARR_EQ_UNORDERED(actual, expected);
//}
//
//TEST_F(FindPrivateNucMutations, Returns_Empty_If_Same_muts) {
//  auto tree = Tree(R"({ "tree": {} })");
//  const auto muts = std::vector<std::string>{"A123C", "T456C", "A789G"};
//  TreeNode node = makeNodeMap(tree, muts);
//  AnalysisResult seq = makeQuery(muts);
//  const auto actual = findPrivateNucMutations(node, seq, rootSeq);
//  const auto expected = makeMutList({});
//  EXPECT_ARR_EQ_UNORDERED(actual, expected);
//}
//
//TEST_F(FindPrivateNucMutations, Returns_Query_Muts_For_Disjoint_Sets) {
//  auto tree = Tree(R"({ "tree": {} })");
//  TreeNode node = makeNodeMap(tree, {"A123C", "T456C", "A789G"});
//  const auto queryMuts = std::vector<std::string>{{"A123G", "T147C", "A258G"}};
//  AnalysisResult seq = makeQuery(queryMuts);
//  const auto actual = findPrivateNucMutations(node, seq, rootSeq);
//  const auto expected = makeMutList(queryMuts);
//  EXPECT_ARR_EQ_UNORDERED(actual, expected);
//}
//
//TEST_F(FindPrivateNucMutations, Returns_Set_Difference_In_General_Case) {
//  auto tree = Tree(R"({ "tree": {} })");
//
//  TreeNode node = makeNodeMap(tree,//
//    {
//      "C567C",
//      "C123A",
//      "C45874Y",
//      "C45875A",
//      "C333Y",
//      "C111B",
//      "C679N",
//    });
//
//  AnalysisResult seq = makeQuery(//
//    {
//      "C679Y",
//      "C123B",
//      "C567C",
//      "C45875Y",
//    });
//
//  const auto expected = makeMutList(//
//    {
//      "C123B",
//      "C679Y",
//      "C45875Y",
//    });
//
//  const auto actual = findPrivateNucMutations(node, seq, rootSeq);
//
//  EXPECT_ARR_EQ_UNORDERED(actual, expected);
//}
