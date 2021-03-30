#include "../../src/io/parseMutation.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include "../../include/nextclade/nextclade.h"
#include "../../include/nextclade/private/nextclade_private.h"


#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected))
#define EXPECT_MAP_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ContainerEq(expected))

namespace {
  using Nextclade::NucleotideSubstitution;
  using Nextclade::parseMutation;
}// namespace


TEST(ParseMutation, General_Case) {
  const auto actual = parseMutation("A123C");
  const auto expected =
    NucleotideSubstitution{.refNuc = Nucleotide::A, .pos = 122, .queryNuc = Nucleotide::C, .pcrPrimersChanged = {}};
  EXPECT_EQ(actual, expected);
}

TEST(ParseMutation, With_N_Right) {
  const auto actual = parseMutation("A123N");
  const auto expected =
    NucleotideSubstitution{.refNuc = Nucleotide::A, .pos = 122, .queryNuc = Nucleotide::N, .pcrPrimersChanged = {}};
  EXPECT_EQ(actual, expected);
}

TEST(ParseMutation, With_N_Left) {
  const auto actual = parseMutation("N123C");
  const auto expected =
    NucleotideSubstitution{.refNuc = Nucleotide::N, .pos = 122, .queryNuc = Nucleotide::C, .pcrPrimersChanged = {}};
  EXPECT_EQ(actual, expected);
}

TEST(ParseMutation, With_Gap_Right) {
  const auto actual = parseMutation("A123-");
  const auto expected =
    NucleotideSubstitution{.refNuc = Nucleotide::A, .pos = 122, .queryNuc = Nucleotide::GAP, .pcrPrimersChanged = {}};
  EXPECT_EQ(actual, expected);
}

TEST(ParseMutation, With_Gap_Left) {
  const auto actual = parseMutation("-123C");
  const auto expected =
    NucleotideSubstitution{.refNuc = Nucleotide::GAP, .pos = 122, .queryNuc = Nucleotide::C, .pcrPrimersChanged = {}};
  EXPECT_EQ(actual, expected);
}
