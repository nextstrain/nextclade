#include "../analyze/isSequenced.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade/private/nextclade_private.h>

namespace {
  using Nextclade::isSequenced;
  using Nextclade::NextcladeResult;
  using Nextclade::NucleotideRange;
}//namespace

TEST(isSequenced, True_When_In_Range_And_No_Missing) {
  NextcladeResult res = {
    .missing = {},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_TRUE(isSequenced(130, res));
}

TEST(isSequenced, True_When_In_Range_And_Not_In_Missing) {
  NextcladeResult res = {
    .missing = std::vector<NucleotideRange>{NucleotideRange{
      .begin = 120,
      .end = 150,
      .length = 30,
      .nuc = Nucleotide::GAP,
    }},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_TRUE(isSequenced(110, res));
}

TEST(isSequenced, False_When_Not_In_Range_Left_Adjacent) {
  NextcladeResult res = {
    .missing = {},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_FALSE(isSequenced(99, res));
}

TEST(isSequenced, False_When_Not_In_Range_Left) {
  NextcladeResult res = {
    .missing = {},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_FALSE(isSequenced(55, res));
}

TEST(isSequenced, False_When_Not_In_Range_Right_Adjacent) {
  NextcladeResult res = {
    .missing = {},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_FALSE(isSequenced(200, res));
}

TEST(isSequenced, False_When_Not_In_Range_Right) {
  NextcladeResult res = {
    .missing = {},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_FALSE(isSequenced(230, res));
}

TEST(isSequenced, False_When_Missing) {
  NextcladeResult res = {
    .missing = std::vector<NucleotideRange>{NucleotideRange{
      .begin = 120,
      .end = 150,
      .length = 30,
      .nuc = Nucleotide::GAP,
    }},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_FALSE(isSequenced(130, res));
}
