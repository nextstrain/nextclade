#include <gtest/gtest.h>
#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>


TEST(Range, Constructs) {
  Range range{.begin = 3, .end = 5};
  EXPECT_EQ(range.begin, 3);
  EXPECT_EQ(range.end, 5);
}

TEST(Range, EqualsTrue) {
  Range range1{.begin = 3, .end = 5};
  Range range2{.begin = 3, .end = 5};
  EXPECT_TRUE(range1 == range2);
  EXPECT_TRUE(range2 == range1);
}

TEST(Range, EqualsFalse) {
  Range range1{.begin = 3, .end = 5};
  Range range2{.begin = 7, .end = 8};
  EXPECT_FALSE(range1 == range2);
  EXPECT_FALSE(range2 == range1);
}

TEST(Range, NotEqualsTrue) {
  Range range1{.begin = 3, .end = 5};
  Range range2{.begin = 7, .end = 8};
  EXPECT_TRUE(range1 != range2);
  EXPECT_TRUE(range2 != range1);
}

TEST(Range, NotEqualsFalse) {
  Range range1{.begin = 3, .end = 5};
  Range range2{.begin = 3, .end = 5};
  EXPECT_FALSE(range1 != range2);
  EXPECT_FALSE(range2 != range1);
}

TEST(Range, AddScalar) {
  Range range1{.begin = 3, .end = 5};
  Range expected{.begin = 6, .end = 8};
  EXPECT_EQ(range1 + 3, expected);
}

TEST(Range, SubScalar) {
  Range range1{.begin = 3, .end = 5};
  Range expected{.begin = 0, .end = 2};
  EXPECT_EQ(range1 - 3, expected);
}

TEST(Range, MulByScalar) {
  Range range1{.begin = 3, .end = 5};
  Range expected{.begin = 9, .end = 15};
  EXPECT_EQ(range1 * 3, expected);
}

TEST(Range, DivByScalar) {
  Range range1{.begin = 9, .end = 21};
  Range expected{.begin = 3, .end = 7};
  EXPECT_EQ(range1 / 3, expected);
}

TEST(Range, DivByScalarUneven) {
  Range range1{.begin = 9, .end = 21};
  Range expected{.begin = 4, .end = 10};
  EXPECT_EQ(range1 / 2, expected);
}
