#include "../src/translate/decode.h"

#include <gtest/gtest.h>

#include "../src/alphabet/aminoacids.h"
#include "../src/alphabet/nucleotides.h"

TEST(decode, DecodesGap) {

  EXPECT_EQ(aaToChar(decode(toNucleotideSequence("---"))), '-');
}

TEST(decode, DecodesValidAminoacid) {
  EXPECT_EQ(aaToChar(decode(toNucleotideSequence("ATG"))), 'M');
}

TEST(decode, DecodesUnknownToX) {
  EXPECT_EQ(aaToChar(decode(toNucleotideSequence("TNN"))), 'X');
}
