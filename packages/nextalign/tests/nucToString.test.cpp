#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextalign/nextalign.h>

#include <array>

#include "../src/alphabet/aminoacids.h"
#include "../src/alphabet/nucleotides.h"


TEST(nucToChar, Simple) {
  EXPECT_EQ('A', nucToChar(Nucleotide::A));
  EXPECT_EQ('N', nucToChar(Nucleotide::N));
  EXPECT_EQ('Y', nucToChar(Nucleotide::Y));
  EXPECT_EQ('-', nucToChar(Nucleotide::GAP));
}

TEST(nucToString, Simple) {
  EXPECT_EQ(std::string{"A"}, nucToString(Nucleotide::A));
  EXPECT_EQ(std::string{"N"}, nucToString(Nucleotide::N));
  EXPECT_EQ(std::string{"Y"}, nucToString(Nucleotide::Y));
  EXPECT_EQ(std::string{"-"}, nucToString(Nucleotide::GAP));
}

TEST(aaToChar, Simple) {
  EXPECT_EQ('A', aaToChar(Aminoacid::A));
  EXPECT_EQ('N', aaToChar(Aminoacid::N));
  EXPECT_EQ('Y', aaToChar(Aminoacid::Y));
  EXPECT_EQ('-', aaToChar(Aminoacid::GAP));
  EXPECT_EQ('*', aaToChar(Aminoacid::STOP));
}

TEST(aaToString, Simple) {
  EXPECT_EQ(std::string{"A"}, aaToString(Aminoacid::A));
  EXPECT_EQ(std::string{"N"}, aaToString(Aminoacid::N));
  EXPECT_EQ(std::string{"Y"}, aaToString(Aminoacid::Y));
  EXPECT_EQ(std::string{"-"}, aaToString(Aminoacid::GAP));
  EXPECT_EQ(std::string{"*"}, aaToString(Aminoacid::STOP));
}
