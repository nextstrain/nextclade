#include "../src/utils/range.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include <iostream>
#include <optional>
#include <utility>

namespace std {

  inline std::ostream& operator<<(std::ostream& os, const std::pair<int, int>& p) {
    os << "{ " << p.first << ", " << p.second << " }";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const std::nullopt_t p) {
    os << "std::nullopt";
    return os;
  }

  inline std::ostream& operator<<(std::ostream& os, const std::optional<std::pair<int, int>>& p) {
    if (p) {
      return operator<<(os, std::nullopt);
    }

    return operator<<(os, *p);
  }
}// namespace std


TEST(RangeIntersect, Empty_when_disjoint_left) {
  //  xxx
  //       yy
  // 0123456789
  EXPECT_FALSE(intersection({1, 4}, {6, 8}));
}

TEST(RangeIntersect, Empty_when_disjoint_right) {
  //  yyy
  //       xx
  // 0123456789
  EXPECT_FALSE(intersection({6, 8}, {1, 4}));
}


TEST(RangeIntersect, Empty_when_adjacent_left) {
  //  xxx
  //     yyy
  // 0123456789
  EXPECT_FALSE(intersection({1, 4}, {4, 7}));
}

TEST(RangeIntersect, Empty_when_adjacent_right) {
  //  yyy
  //     xxx
  // 0123456789
  EXPECT_FALSE(intersection({4, 7}, {1, 4}));
}


TEST(RangeIntersect, Overlap_one_left) {
  //  xxx
  //    yyy
  // 0123456789
  EXPECT_EQ(std::make_pair(3, 4), intersection({1, 4}, {3, 6}));
}

TEST(RangeIntersect, Overlap_one_right) {
  //  yyy
  //    xxx
  // 0123456789
  EXPECT_EQ(std::make_pair(3, 4), intersection({3, 6}, {1, 4}));
}


TEST(RangeIntersect, Overlap_many_left) {
  //  xxxxx
  //    yyyyy
  // 0123456789
  EXPECT_EQ(std::make_pair(3, 6), intersection({1, 6}, {3, 8}));
}

TEST(RangeIntersect, Overlap_many_right) {
  //  yyyyy
  //    xxxxx
  // 0123456789
  EXPECT_EQ(std::make_pair(3, 6), intersection({3, 8}, {1, 6}));
}


TEST(RangeIntersect, Contains_left) {
  //  xxxxxxx
  //    yyy
  // 0123456789
  EXPECT_EQ(std::make_pair(3, 6), intersection({1, 6}, {3, 8}));
}

TEST(RangeIntersect, Contains_right) {
  //  yyyyyyy
  //    xxx
  // 0123456789
  EXPECT_EQ(std::make_pair(3, 6), intersection({3, 8}, {1, 6}));
}


TEST(RangeIntersect, Equal) {
  //  xxxxx
  //  yyyyy
  // 0123456789
  EXPECT_EQ(std::make_pair(1, 6), intersection({1, 6}, {1, 6}));
}
