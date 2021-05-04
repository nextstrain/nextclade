#include "../analyze/isSequenced.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade/private/nextclade_private.h>

namespace {
  using Nextclade::isSequenced;
  using Nextclade::AnalysisResult;
  using Nextclade::NucleotideRange;
}//namespace

TEST(isSequenced, True_When_In_Range_And_No_Missing) {
  AnalysisResult res = {
    .missing = {},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_TRUE(isSequenced(130, res));
}

TEST(isSequenced, True_When_In_Range_And_Not_In_Missing) {
  AnalysisResult res = {
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
  AnalysisResult res = {
    .missing = {},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_FALSE(isSequenced(99, res));
}

TEST(isSequenced, False_When_Not_In_Range_Left) {
  AnalysisResult res = {
    .missing = {},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_FALSE(isSequenced(55, res));
}

TEST(isSequenced, False_When_Not_In_Range_Right_Adjacent) {
  AnalysisResult res = {
    .missing = {},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_FALSE(isSequenced(200, res));
}

TEST(isSequenced, False_When_Not_In_Range_Right) {
  AnalysisResult res = {
    .missing = {},
    .alignmentStart = 100,
    .alignmentEnd = 200,
  };
  EXPECT_FALSE(isSequenced(230, res));
}

TEST(isSequenced, False_When_Missing) {
  AnalysisResult res = {
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
