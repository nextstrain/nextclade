//#include <gmock/gmock.h>
//#include <gtest/gtest.h>
//
//#include <string>
//
//#include "../src/analyzeSequence.h"
//
//#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected));
//
//
//TEST(analyzeSequences, ReportsAlignmentStartAndEnd) {
//  std::stringstream input;
//
//  const std::string query = "NNNAAANNN";
//  const std::string ref = "AAAA";
//
//  const auto results = analyzeSequence(query, ref);
//
//  EXPECT_EQ(4, results.alignmentStart);
//  EXPECT_EQ(8, results.alignmentEnd);
//}
//
//TEST(analyzeSequences, ReportsInsertions) {
//  std::stringstream input;
//
//  const std::string query = "AACAA";
//  const std::string ref = "AAAA";
//
//  const auto results = analyzeSequence(query, ref);
//
//  const auto expected = std::vector<NucleotideInsertion>({{
//    .pos = 2,
//    .ins = "C",
//  }});
//
//  EXPECT_ARR_EQ(expected, results.insertions)
//}
//
//TEST(analyzeSequences, ReportsSubstitutions) {
//  std::stringstream input;
//
//  const std::string query = "ACAA";
//  const std::string ref = "AAAA";
//
//  const auto results = analyzeSequence(query, ref);
//
//  const auto expected = std::vector<NucleotideSubstitution>({{
//    .pos = 1,
//    .refNuc = 'A',
//    .queryNuc = 'C',
//  }});
//
//  EXPECT_ARR_EQ(expected, results.substitutions)
//}
//
//TEST(analyzeSequences, ReportsDeletions) {
//  std::stringstream input;
//
//  const std::string query = "CTG";
//  const std::string ref = "CTAG";
//
//  const auto results = analyzeSequence(query, ref);
//
//  const auto expected = std::vector<NucleotideDeletion>({{
//    .start = 1,
//    .length = 1,
//  }});
//
//  EXPECT_ARR_EQ(expected, results.deletions)
//}
