#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextalign/nextalign.h>

#include <sstream>

using ExpectedResults = std::vector<AlgorithmInput>;


bool operator==(const AlgorithmInput& left, const AlgorithmInput& right) {
  // clang-format off
  return left.index == right.index &&
         left.seq == right.seq &&
         left.seqName == right.seqName;
  // clang-format on
}

std::ostream& operator<<(std::ostream& os, const AlgorithmInput& input) {
  const int maxSeqLength = 32;

  os << "{ ";
  os << "index: " << input.index << ", ";
  os << "seqName: " << input.seqName << ", ";
  os << "seq: " << input.seq.substr(0, maxSeqLength) << "(truncated)... , ";
  os << "}";
  return os;
}


TEST(parseSequences, SanitizesSequences) {
  std::stringstream input;

  // clang-format off
  input << R"(  >  Hello/Sequence/ID1234

 ABC?D
EF.GH

  L*M#N!OP


X Y:)Z
  )"  ;
  // clang-format on

  const auto results = parseSequences(input);

  const ExpectedResults expected = {
    {0, "Hello/Sequence/ID1234", "ABC?DEF.GHL*MNOPXYZ"},
  };
  EXPECT_EQ(results.size(), expected.size());
  EXPECT_THAT(results, testing::ElementsAreArray(expected));
}


TEST(parseSequences, ConvertsSequencesToUppercase) {
  std::stringstream input;

  input << R"(>Some/Sequence
  Hi,
  Can you make it uppercase please?
  Cheers!
  )";

  const auto results = parseSequences(input);

  const ExpectedResults expected = {
    {0, "Some/Sequence", "HICANYOUMAKEITUPPERCASEPLEASE?CHEERS"},
  };
  EXPECT_EQ(results.size(), expected.size());
  EXPECT_THAT(results, testing::ElementsAreArray(expected));
}

TEST(parseSequences, DeduplicatesSequenceNames) {
  std::stringstream input;

  input << R"(
    >Hello
    ABCD

    >World
    EFGH

    >Foo
    Bar

    >World
    IJKLMN

    >Hello
    OPQRS
  )";

  const auto results = parseSequences(input);

  const ExpectedResults expected = {
    {0, "Hello", "ABCD"},
    {1, "World", "EFGH"},
    {2, "Foo", "BAR"},
    {3, "World (1)", "IJKLMN"},
    {4, "Hello (1)", "OPQRS"},
  };
  EXPECT_EQ(results.size(), expected.size());
  EXPECT_THAT(results, testing::ElementsAreArray(expected));
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

  const ExpectedResults expected = {
    {0, "Untitled", "ABCD"},
    {1, "Untitled (1)", "EFGH"},
  };
  EXPECT_EQ(results.size(), expected.size());
  EXPECT_THAT(results, testing::ElementsAreArray(expected));
}

TEST(parseSequences, AllowsPlainText) {
  std::stringstream input;

  input << R"(
    This is
    plain text!
  )";

  const auto results = parseSequences(input);

  const ExpectedResults expected = {
    {0, "Untitled", "THISISPLAINTEXT"},
  };
  EXPECT_EQ(results.size(), expected.size());
  EXPECT_THAT(results, testing::ElementsAreArray(expected));
}
