#include <gtest/gtest.h>

#include <sstream>

#include "../src/parseSequences.h"


TEST(parseSequences, SanitizesSequences) {
  std::stringstream input;

  input << R"(  >  Hello/Sequence/ID1234
 ABC?D
EF.GH
L*M#N!OP
X Y:)Z
  )";

  const auto results = parseSequences(input);

  const auto result = results.begin();
  EXPECT_NE(results.begin(), results.end());
  EXPECT_EQ("Hello/Sequence/ID1234", result->first);
  EXPECT_EQ("ABC?DEF.GHL*MNOPXYZ", result->second);
}

TEST(parseSequences, DeduplicatesSequenceNames) {
  std::stringstream input;

  input << R"(
    >Hello
    ABCD
    >Hello
    EFGH
  )";

  const auto results = parseSequences(input);

  EXPECT_EQ(results.size(), 2);

  const auto one = results.begin();
  const auto two = ++results.begin();

  EXPECT_EQ("Hello", one->first);
  EXPECT_EQ("Hello (1)", two->first);
}

TEST(parseSequences, AssignsSequenceNameToUntitledSequences) {
  std::stringstream input;

  input << R"(
    >
    ABCD
    >
    EFGH
  )";

  const auto results = parseSequences(input);

  EXPECT_EQ(results.size(), 2);

  const auto one = results.begin();
  const auto two = ++results.begin();

  EXPECT_EQ("Untitled", one->first);
  EXPECT_EQ("Untitled (1)", two->first);
}
