#include <gtest/gtest.h>

#include <string>

#include "../src/alignPairwise.h"

constexpr const int minLength = 0;


TEST(alignPairwise, MatchesIdenticalStrings) {
  std::stringstream input;

  // clang-format off
  const std::string qry = "ACGCTCGCT";
  const std::string ref = "ACGCTCGCT";
  // clang-format on

  const auto result = alignPairwise(qry, ref, minLength);
  EXPECT_EQ(ref, result.ref);
  EXPECT_EQ(qry, result.query);
}

TEST(alignPairwise, PadsMissingLeft) {
  std::stringstream input;

  // clang-format off
  const std::string qry =       "CTCGCT";
  const std::string ref =    "ACGCTCGCT";
  const std::string qryAln = "---CTCGCT";
  // FIXME: actual qryAln    "-C--TCGCT"
  // clang-format on

  const auto result = alignPairwise(qry, ref, minLength);
  EXPECT_EQ(ref, result.ref);
  EXPECT_EQ(qryAln, result.query);
}

TEST(alignPairwise, PadsMissingRight) {
  std::stringstream input;

  // clang-format off
  const std::string qry =    "ACGCTC";
  const std::string ref =    "ACGCTCGCT";
  const std::string qryAln = "ACGCTC---";
  // clang-format on

  const auto result = alignPairwise(qry, ref, minLength);
  EXPECT_EQ(ref, result.ref);
  EXPECT_EQ(qryAln, result.query);
}

TEST(alignPairwise, HandlesQueryContainedInRef) {
  std::stringstream input;

  // clang-format off
  const std::string qry =       "ACGCTC";
  const std::string ref =    "GCCACGCTCGCT";
  const std::string qryAln = "---ACGCTC---";
  // clang-format on

  const auto result = alignPairwise(qry, ref, minLength);
  EXPECT_EQ(ref, result.ref);
  EXPECT_EQ(qryAln, result.query);
}

TEST(alignPairwise, HandlesRefContainedInQuery) {
  std::stringstream input;

  // clang-format off
  const std::string qry =    "GCCACGCTCGCT";
  const std::string ref =       "ACGCTC";
  const std::string refAln = "---ACGCTC---";
  // clang-format on

  const auto result = alignPairwise(qry, ref, minLength);
  EXPECT_EQ(refAln, result.ref);
  EXPECT_EQ(qry, result.query);
}

TEST(alignPairwise, AddsGapsWhenOneMismatch) {
  std::stringstream input;

  // clang-format off
  const std::string qry =    "GCCACTCCCT";
  const std::string ref =    "GCCACGCTCGCT";// FIXME: looks like there is more then one mismatch despite the name of the test?
  const std::string qryAln = "GCCAC--TCCCT";
  // FIXME: actual qryAln    "GCCACTC-C-CT"
  // clang-format on

  const auto result = alignPairwise(qry, ref, minLength);
  EXPECT_EQ(ref, result.ref);
  EXPECT_EQ(qryAln, result.query);
}

TEST(alignPairwise, AddsGapsInRefWhenOneAmbiguousButMatchingChar) {
  std::stringstream input;

  // clang-format off
  const std::string qry =    "GCCACGCTCRCT";
  const std::string ref =    "GCCACTCGCT";
  const std::string refAln = "GCCAC--TCGCT";
  // FIXME: actual refAln    "GCCACTC-C-CT"
  // clang-format on

  const auto result = alignPairwise(qry, ref, minLength);
  EXPECT_EQ(refAln, result.ref);
  EXPECT_EQ(qry, result.query);
}

TEST(alignPairwise, CorrectlyAlignsAmbiguousGapPlacingCase) {
  std::stringstream input;

  // clang-format off
  const std::string qry =    "ACATCTT";
  const std::string ref =    "ACATATGGCACTT";
  const std::string qryAln = "ACAT------CTT";
  // FIXME: actual qryAln    "ACAT----C--TT"
  // clang-format on

  const auto result = alignPairwise(qry, ref, minLength);
  EXPECT_EQ(ref, result.ref);
  EXPECT_EQ(qryAln, result.query);
}


TEST(alignPairwise, CorrectlyAlignsAmbiguousGapPlacingCaseReversed) {
  std::stringstream input;

  // clang-format off
  const std::string qry =    "ACATATGGCACTT";
  const std::string ref =    "ACATCTT";
  const std::string refAln = "ACAT------CTT";
  // FIXME: actual refAln    "ACAT----C--TT"
  // clang-format on

  const auto result = alignPairwise(qry, ref, minLength);
  EXPECT_EQ(refAln, result.ref);
  EXPECT_EQ(qry, result.query);
}

TEST(alignPairwise, CorrectlyAlignsLongComplexQuery) {
  std::stringstream input;

  // clang-format off
  const std::string ref =    "CTTGGAGGTTCCGTGGCTAGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTGAGCCTTTGT";
  const std::string qry =    "CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATCAAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT";
  const std::string refAln = "CTTGGAGGTTCCGTGGCTA----GATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTG---AGCCTTTGT";
  // FIXME actual refAln     "CTTGGAGGTTCCGTGGCTA----GATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTG-A--GCCTTTGT"
  const std::string qryAln = "CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATC-----AAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT";
  // FIXME actual qryAln     "CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATC---A-A-GCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT"
  // clang-format on

  const auto result = alignPairwise(qry, ref, minLength);
  EXPECT_EQ(refAln, result.ref);
  EXPECT_EQ(qryAln, result.query);
}
