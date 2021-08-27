#include <gtest/gtest.h>

#include <vector>

#include "../analyze/isMatch.h"

using Nextclade::isMatch;

TEST(isMatch, ShouldMatchAnyCanonicalWithN) {
  EXPECT_TRUE(isMatch(Nucleotide::N, Nucleotide::A));
  EXPECT_TRUE(isMatch(Nucleotide::A, Nucleotide::N));
}

TEST(isMatch, ShouldMatchAnyAmbiguousWithN) {
  EXPECT_TRUE(isMatch(Nucleotide::N, Nucleotide::S));
  EXPECT_TRUE(isMatch(Nucleotide::S, Nucleotide::N));
}

TEST(isMatch, ShouldMatchAmbiguousRWithA) {
  EXPECT_TRUE(isMatch(Nucleotide::R, Nucleotide::A));
  EXPECT_TRUE(isMatch(Nucleotide::A, Nucleotide::R));
}

TEST(isMatch, ShouldNotMatchAmbiguousRWithC) {
  EXPECT_FALSE(isMatch(Nucleotide::R, Nucleotide::C));
  EXPECT_FALSE(isMatch(Nucleotide::C, Nucleotide::R));
}

TEST(isMatch, ShouldMatchAmbiguousSWithC) {
  EXPECT_TRUE(isMatch(Nucleotide::S, Nucleotide::C));
  EXPECT_TRUE(isMatch(Nucleotide::C, Nucleotide::S));
}

TEST(isMatch, ShouldNotMatchAmbiguousSWithA) {
  EXPECT_FALSE(isMatch(Nucleotide::S, Nucleotide::A));
  EXPECT_FALSE(isMatch(Nucleotide::A, Nucleotide::S));
}
