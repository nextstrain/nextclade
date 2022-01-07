#include "../src/translate/mapCoordinates.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include <array>

namespace {
  /** Wraps the original class to expose internal arrays for testing purposes */
  class CoordinateMapperExposed : public CoordinateMapper {
  public:
    explicit CoordinateMapperExposed(const NucleotideSequence& refAln) : CoordinateMapper(refAln) {}

    [[nodiscard]] inline const safe_vector<int>& getAlnToRefMap() const {
      return alnToRefMap;
    }

    [[nodiscard]] inline const safe_vector<int>& getRefToAlnMap() const {
      return refToAlnMap;
    }
  };
}//namespace

TEST(mapCoordinates, MapsRefToAlnSimple) {
  // ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
  // ref    : A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
  // aln pos: 0  1  2  3           7  8  9  10          14

  const auto ref = toNucleotideSequence("ACTC---CGTG---A");
  CoordinateMapperExposed coordMap(ref);
  const auto& actual = coordMap.getRefToAlnMap();
  const auto expected = safe_vector<int>{0, 1, 2, 3, 7, 8, 9, 10, 14};
  EXPECT_THAT(actual, testing::ElementsAreArray(expected));
}

TEST(mapCoordinates, MapsRefToAlnWithLeadingInsertions) {
  // ref pos:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
  // ref    :  -  -  A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
  // aln pos:  -  -  2  3  4  5           9  10 11 12          16

  const auto ref = toNucleotideSequence("--ACTC---CGTG---A");
  CoordinateMapperExposed coordMap(ref);
  const auto& actual = coordMap.getRefToAlnMap();
  const auto expected = safe_vector<int>{2, 3, 4, 5, 9, 10, 11, 12, 16};
  EXPECT_THAT(actual, testing::ElementsAreArray(expected));
}

TEST(mapCoordinates, MapsAlnToRefSimple) {
  // ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
  // ref    : A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
  // aln pos: 0  1  2  3  3  3  3  4  5  6  7  7  7  7  8

  const auto ref = toNucleotideSequence("ACTC---CGTG---A");
  CoordinateMapperExposed coordMap(ref);
  const auto& actual = coordMap.getAlnToRefMap();
  const auto expected = safe_vector<int>{0, 1, 2, 3, 3, 3, 3, 4, 5, 6, 7, 7, 7, 7, 8};
  EXPECT_THAT(actual, testing::ElementsAreArray(expected));
}

TEST(mapCoordinates, MapsAlnToRefWithLeadingInsertions) {
  // ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
  // ref    : -  -  A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
  // aln pos: 0  0  0  1  2  3  3  3  3  4  5  6  7  7  7  7  8

  const auto ref = toNucleotideSequence("--ACTC---CGTG---A");
  CoordinateMapperExposed coordMap(ref);
  const auto& actual = coordMap.getAlnToRefMap();
  const auto expected = safe_vector<int>{0, 0, 0, 1, 2, 3, 3, 3, 3, 4, 5, 6, 7, 7, 7, 7, 8};
  EXPECT_THAT(actual, testing::ElementsAreArray(expected));
}


TEST(mapCoordinates, MapsRangeRefToAlnSimple) {
  const auto ref = toNucleotideSequence("ACTC---CGTG---A");
  CoordinateMapperExposed coordMap(ref);
  const Range actual = coordMap.refToAln({.begin = 3, .end = 6});
  const Range expected{.begin = 3, .end = 9};
  EXPECT_EQ(actual, expected);
}

TEST(mapCoordinates, MapsRangeAlnToRefSimple) {
  const auto ref = toNucleotideSequence("ACTC---CGTG---A");
  CoordinateMapperExposed coordMap(ref);
  const Range actual = coordMap.alnToRef({.begin = 3, .end = 9});
  const Range expected{.begin = 3, .end = 6};
  EXPECT_EQ(actual, expected);
}


TEST(mapCoordinates, MapsRangeRefToAlnWithLeadingInsertions) {
  const auto ref = toNucleotideSequence("--ACTC---CGTG---A");
  CoordinateMapperExposed coordMap(ref);
  const Range actual = coordMap.refToAln({.begin = 3, .end = 6});
  const Range expected{.begin = 5, .end = 11};
  EXPECT_EQ(actual, expected);
}

TEST(mapCoordinates, MapsRangeAlnToRefWithLeadingInsertions) {
  const auto ref = toNucleotideSequence("--ACTC---CGTG---A");
  CoordinateMapperExposed coordMap(ref);
  const Range actual = coordMap.alnToRef({.begin = 5, .end = 11});
  const Range expected{.begin = 3, .end = 6};
  EXPECT_EQ(actual, expected);
}
