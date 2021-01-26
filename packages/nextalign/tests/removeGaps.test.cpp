
#include "../src/translate/removeGaps.h"

#include <gtest/gtest.h>
#include <nextalign/nextalign.h>

const auto INPUT = toAminoacidSequence("--MY-SPACEBAR---IS--BROKEN-SEND---HELP-");
constexpr const auto OUTPUT = "MYSPACEBARISBROKENSENDHELP";


TEST(removeGaps, RemovesGaps) {
//  const std::string input(INPUT);
  EXPECT_EQ(toString(removeGaps(INPUT)), OUTPUT);
  EXPECT_EQ(toString(INPUT), toString(INPUT));
}

TEST(removeGapsInPlace, RemovesGapsInPlace) {
  AminoacidSequence input(INPUT);
  removeGapsInPlace(input);
  EXPECT_EQ(toString(input), OUTPUT);
}
