#include <tuple>
#include <vector>

#include <gtest/gtest.h>

#include "../src/add.h"

// Plain test
TEST(Add, adds) {
    const auto actual = add(3, 2);
    const auto expected = 5;

    EXPECT_EQ(expected, actual);
}

// Parametrized test
class AddWithParams : public testing::TestWithParam<std::tuple<int, int, int>> {
};


TEST_P(AddWithParams, adds) {
    auto[x, y, sum] = GetParam();
    EXPECT_EQ(sum, add(x, y));
}


INSTANTIATE_TEST_SUITE_P

(Add, AddWithParams,
 ::testing::Values(
         // first arg, second arg, result
         std::make_tuple(0, 0, 0), std::make_tuple(2, 3, 5),
         std::make_tuple(2, -3, -1)));
