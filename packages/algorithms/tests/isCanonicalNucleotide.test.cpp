#include <gtest/gtest.h>

#include <sstream>

#include "../src/isCannonicalNucleotide.h"


TEST(isCanonicalNucleotide, AcceptsCannonicalNucleotides) {
  EXPECT_TRUE(isCanonicalNucleotide('A'));
  EXPECT_TRUE(isCanonicalNucleotide('G'));
  EXPECT_TRUE(isCanonicalNucleotide('T'));
  EXPECT_TRUE(isCanonicalNucleotide('C'));
}

TEST(isCanonicalNucleotide, RejectsNonCannonicalNucleotides) {
  EXPECT_FALSE(isCanonicalNucleotide('B'));
  EXPECT_FALSE(isCanonicalNucleotide('N'));
  EXPECT_FALSE(isCanonicalNucleotide('*'));
  EXPECT_FALSE(isCanonicalNucleotide('.'));
  EXPECT_FALSE(isCanonicalNucleotide('\n'));
  EXPECT_FALSE(isCanonicalNucleotide(' '));
}
