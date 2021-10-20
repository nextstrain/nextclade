#include "../../src/tree/findPrivateNucMutations.h"

#include <gtest/gtest.h>

#include <exception>
#include <map>

#include "../../include/nextclade/private/nextclade_private.h"
#include "../../src/io/parseMutation.h"
#include "../../src/tree/TreeNode.h"
#include "../../src/tree/treePreprocess.h"
#include "../../src/utils/safe_cast.h"

template<typename Container>
constexpr void EXPECT_EMPTY(const Container& actual) {
  EXPECT_EQ(actual, Container{});
}

namespace {
  using Nextclade::AnalysisResult;
  using Nextclade::NucleotideDeletion;
  using Nextclade::NucleotideDeletionSimple;
  using Nextclade::NucleotideSubstitution;
  using Nextclade::NucleotideSubstitutionSimple;

  using Nextclade::findPrivateNucMutations;
  using Nextclade::parseMutation;

  /** Text fixture and some helper methods. The actual TESTs are below that */
  class FindPrivateNucMutations : public ::testing::Test {
  protected:
    //                                                               10        20        30        40        50
    //     indices here are one-based!                               |         |         |         |         |
    //                                                      12345678901234567890123456789012345678901234567890
    const NucleotideSequence refSeq = toNucleotideSequence("CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC");


    std::map<int, Nucleotide> makeTestNode(const std::vector<std::string>& mutStrings) {
      std::map<int, Nucleotide> result;
      for (const auto& mutStr : mutStrings) {
        auto sub = parseMutation(mutStr);
        result[sub.pos] = sub.qry;
      }
      return result;
    }

    AnalysisResult makeTestSeq(const std::vector<std::string>& mutStrings, const std::vector<int>& dels) {
      std::vector<NucleotideSubstitution> substitutions;
      substitutions.reserve(mutStrings.size());
      for (const auto& mutStr : mutStrings) {
        substitutions.emplace_back(parseMutation(mutStr));
      }

      std::vector<NucleotideDeletion> deletions;
      deletions.reserve(dels.size());
      for (const auto& del : dels) {
        deletions.emplace_back(NucleotideDeletion{
          .start = del - 1,
          .length = 1,
          .aaSubstitutions = {},
          .aaDeletions = {},
        });
      }
      return AnalysisResult{
        .substitutions = substitutions,
        .deletions = deletions,
        .alignmentStart = 0,
        .alignmentEnd = safe_cast<int>(refSeq.size()),
      };
    }

    std::vector<NucleotideSubstitutionSimple> makeSubstitutionList(const std::vector<std::string>& substitutions) {
      std::vector<NucleotideSubstitutionSimple> muts;
      for (const auto& sub : substitutions) {
        const auto mut = parseMutation(sub);
        muts.emplace_back(NucleotideSubstitutionSimple{
          .ref = mut.ref,
          .pos = mut.pos,
          .qry = mut.qry,
        });
      }
      return muts;
    }

    std::vector<NucleotideDeletionSimple> makeDeletionList(const std::vector<std::string>& deletions) {
      std::vector<NucleotideDeletionSimple> muts;
      for (const auto& sub : deletions) {
        const auto mut = parseMutation(sub);
        muts.emplace_back(NucleotideDeletionSimple{
          .ref = mut.ref,
          .pos = mut.pos,
        });
      }
      return muts;
    }
  };
}// namespace

TEST_F(FindPrivateNucMutations, NoMutations) {
  // No mutations in node and no mutations in sequence. Expected to find an empty array. This is a degenerate case and
  // is unlikely to occur.
  const auto node = makeTestNode({/* no mutations in ref node */});
  const auto seq = makeTestSeq({/* no query substitutions */}, {/* no query deletions */});
  const auto expected = makeSubstitutionList({});
  const auto actual = findPrivateNucMutations(node, seq, refSeq);
  EXPECT_EQ(actual.privateSubstitutions, expected);
  EXPECT_EMPTY(actual.privateDeletions);
}

TEST_F(FindPrivateNucMutations, NoMutationsInNodeSomeMutationsInSequence) {
  // No mutations in node and some new mutations in sequence. Expected to find these new mutations as is.
  const auto node = makeTestNode({/* no mutations in ref node */});
  const auto seq = makeTestSeq({"A9C", "T16C", "A32G"}, {/* no query deletions */});
  const auto expected = makeSubstitutionList({"A9C", "T16C", "A32G"});
  const auto actual = findPrivateNucMutations(node, seq, refSeq);
  EXPECT_EQ(actual.privateSubstitutions, expected);
  EXPECT_EMPTY(actual.privateDeletions);
}

TEST_F(FindPrivateNucMutations, NoMutationsInNodeSomeDeletionsInSequence) {
  // No mutations in node and some new deletions in sequence. Expected to find these new deletions as is. The source
  // characters should be taken from ref sequence as follows:
  //
  //                                              10        20        30        40        50
  //                                              |         |         |         |         |
  //                                     12345678901234567890123456789012345678901234567890
  // ref (indices here are one-based!)   CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC
  //                                                ^^                             ^
  //                                             C12  G13                          A42
  const auto node = makeTestNode({/* no mutations in ref node */});
  const auto seq = makeTestSeq({/* no query substitutions */}, {12, 13, 42});
  const auto expected = makeDeletionList({"C12-", "G13-", "A42-"});
  const auto actual = findPrivateNucMutations(node, seq, refSeq);
  EXPECT_EMPTY(actual.privateSubstitutions);
  EXPECT_EQ(actual.privateDeletions, expected);
}

TEST_F(FindPrivateNucMutations, NoMutationsInNodeSomeMutationsAndDeletionsInSequence) {
  // No mutations in node and some new mutations and deletions in sequence. This is a combination of the previous cases.
  const auto node = makeTestNode({/* no mutations in ref node */});
  const auto seq = makeTestSeq({"A9C", "T16C", "A32G"}, {12, 13, 42});
  const auto expectedSubs = makeSubstitutionList({"A9C", "T16C", "A32G"});
  const auto expectedDels = makeDeletionList({"C12-", "G13-", "A42-"});
  const auto actual = findPrivateNucMutations(node, seq, refSeq);
  EXPECT_EQ(actual.privateSubstitutions, expectedSubs);
  EXPECT_EQ(actual.privateDeletions, expectedDels);
}

TEST_F(FindPrivateNucMutations, SameMutation) {
  // Same mutation in node and sequence. It is not private. Expected to find an empty array.
  const auto nodeMutMap = makeTestNode({"A123C"});
  const auto seq = makeTestSeq({"A123C"}, {/* no query deletions */});
  const auto expected = makeSubstitutionList({});
  const auto actual = findPrivateNucMutations(nodeMutMap, seq, refSeq);
  EXPECT_EQ(actual.privateSubstitutions, expected);
  EXPECT_EMPTY(actual.privateDeletions);
}

TEST_F(FindPrivateNucMutations, SameMutationMultiple) {
  // Same multiple mutations in node and sequence. They all are not private. Expected to find an empty array.
  const auto nodeMutMap = makeTestNode({"A9C", "T16C", "A32G"});
  const auto seq = makeTestSeq({"A9C", "T16C", "A32G"}, {/* no query deletions */});
  const auto expected = makeSubstitutionList({});
  const auto actual = findPrivateNucMutations(nodeMutMap, seq, refSeq);
  EXPECT_EQ(actual.privateSubstitutions, expected);
  EXPECT_EMPTY(actual.privateDeletions);
}

TEST_F(FindPrivateNucMutations, SameSiteDifferentCharacter) {
  // A mutation with the same position but the different end character. Expected to find mutation from node character
  // to sequence character.
  const auto nodeMutMap = makeTestNode({"A9C"});
  const auto seq = makeTestSeq({"A9G"}, {/* no query deletions */});
  const auto expected = makeSubstitutionList({"C9G"});
  const auto actual = findPrivateNucMutations(nodeMutMap, seq, refSeq);
  EXPECT_EQ(actual.privateSubstitutions, expected);
  EXPECT_EMPTY(actual.privateDeletions);
}

TEST_F(FindPrivateNucMutations, NoMutationsInSeqSomeMutationsInNode) {
  // No mutations in sequence, but 2 mutations in node. Mutations reverted back to what was in ref sequence.
  // Expected to find 2 mutations from node to ref sequence. The characters in reference sequence are as follows:
  //
  //                                              10        20        30        40        50
  //                                              |         |         |         |         |
  //                                     12345678901234567890123456789012345678901234567890
  // ref (indices here are one-based!)   CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC
  //                                                ^                             ^
  //                                               12C                           42A
  const auto node = makeTestNode({"T12A", "T42G"});
  const auto seq = makeTestSeq({/* no query substitutions */}, {/* no query deletions */});
  const auto expected = makeSubstitutionList({"A12C", "G42A"});
  const auto actual = findPrivateNucMutations(node, seq, refSeq);
  EXPECT_EQ(actual.privateSubstitutions, expected);
  EXPECT_EMPTY(actual.privateDeletions);
}

TEST_F(FindPrivateNucMutations, NoMutationsInSeqSomeDeletionsInNode) {
  // This scenario is handled differently and I currently don't know why.
  //
  // No mutations in sequence, but 2 deletions in node. Deletions reverted back (inserted?) to what was in ref sequence.
  // Expected to find 2 insertions from node to ref sequence. The characters in reference sequence are as follows:
  //
  //                                              10        20        30        40        50
  //                                              |         |         |         |         |
  //                                     12345678901234567890123456789012345678901234567890
  // ref (indices here are one-based!)   CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC
  //                                                ^                             ^
  //                                               12C                           42A
  const auto node = makeTestNode({"T12-", "T42-"});
  const auto seq = makeTestSeq({/* no query substitutions */}, {/* no query deletions */});

  // I would expect it to return this:
  // const auto expected = makeSubstitutionList({"-12C", "-42A"});
  // But we are excluding these insertions by checking if the node's nuc is '-' and skipping the loop iteration.
  // So in this case, an empty array is currently returned.

  const auto actual = findPrivateNucMutations(node, seq, refSeq);

  EXPECT_EMPTY(actual.privateSubstitutions);
  EXPECT_EMPTY(actual.privateDeletions);
}


TEST_F(FindPrivateNucMutations, DisjointSets) {
  // 3 new mutations in sequence, and 2 mutations in node that are not in sequence. These 2 mutations reverted back to
  // what was in ref sequence. Expected to find the 3 new mutations as is, plus 2 mutations from node to ref sequence.
  // The characters in reference sequence are as follows:
  //
  //                                              10        20        30        40        50
  //                                              |         |         |         |         |
  //                                     12345678901234567890123456789012345678901234567890
  // ref (indices here are one-based!)   CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC
  //                                                ^                             ^
  //                                               12C                           42A
  const auto nodeMutMap = makeTestNode({"T12A", "T42G"});
  const auto seq = makeTestSeq({"A9G", "C18A", "G48T"}, {/* no query deletions */});
  const auto expected = makeSubstitutionList({"A9G", "A12C", "C18A", "G42A", "G48T"});
  const auto actual = findPrivateNucMutations(nodeMutMap, seq, refSeq);
  EXPECT_EQ(actual.privateSubstitutions, expected);
  EXPECT_EMPTY(actual.privateDeletions);
}

TEST_F(FindPrivateNucMutations, GeneralCase) {
  // General case. A combination of various previous cases.
  const auto nodeMutMap = makeTestNode({"T12A", "G13A", "C31T", "T34-", "T38-", "T45G"});
  const auto seq = makeTestSeq({"A9C", "T12A", "T16C", "A32G", "T45G", "A47C"}, {13, 21, 34, 42});
  const auto expectedSubs = makeSubstitutionList({"A9C", "T16C", "T31A", "A32G", "A47C"});
  const auto expectedDels = makeDeletionList({"A13-", "A21-", "A42-"});
  const auto actual = findPrivateNucMutations(nodeMutMap, seq, refSeq);
  EXPECT_EQ(actual.privateSubstitutions, expectedSubs);
  EXPECT_EQ(actual.privateDeletions, expectedDels);
}
