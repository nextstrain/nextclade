#include "../src/utils/wraparound.h"

#include <gtest/gtest.h>


TEST(Wraparound, WrapsWithPeriod3) {
  int period = 3;
  EXPECT_EQ(wraparound(+6, period), 0);
  EXPECT_EQ(wraparound(+5, period), 2);
  EXPECT_EQ(wraparound(+4, period), 1);
  EXPECT_EQ(wraparound(+3, period), 0);
  EXPECT_EQ(wraparound(+2, period), 2);
  EXPECT_EQ(wraparound(+1, period), 1);
  EXPECT_EQ(wraparound(00, period), 0);
  EXPECT_EQ(wraparound(-1, period), 2);
  EXPECT_EQ(wraparound(-2, period), 1);
  EXPECT_EQ(wraparound(-3, period), 0);
  EXPECT_EQ(wraparound(-4, period), 2);
  EXPECT_EQ(wraparound(-5, period), 1);
  EXPECT_EQ(wraparound(-6, period), 0);
}
