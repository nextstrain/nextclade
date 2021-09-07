#include "../src/translate/mapCoordinates.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include <array>

TEST(mapCoordinates, MapsSimple) {
  // ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
  // ref    : A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
  // aln pos: 0  1  2  3           7  8  9  10          14

  const auto ref = toNucleotideSequence("ACTC---CGTG---A");
  const auto expected = std::vector<int>{0, 1, 2, 3, 7, 8, 9, 10, 14};
  EXPECT_THAT(mapCoordinates(ref), testing::ElementsAreArray(expected));
}

TEST(mapCoordinates, MapsReverseSimple) {
  // aln pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
  // ref    : A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
  // ref pos: 0  1  2  3  3  3  3  4  5  6  7  7  7  7  8

  const auto ref = toNucleotideSequence("ACTC---CGTG---A");
  const auto expected = std::vector<int>{0, 1, 2, 3, 3, 3, 3, 4, 5, 6, 7, 7, 7, 7, 8};
  EXPECT_THAT(mapReverseCoordinates(ref), expected);
}
