#include "../src/align/alignmentParams.h"

#include <gtest/gtest.h>

#include <string>

#include "../src/align/alignmentParams.h"


TEST(CountGaps, ZeroIfEmpty) {
  const auto queryGapCounts = countGaps(toNucleotideSequence(""));
  EXPECT_EQ(0, queryGapCounts.leading);
  EXPECT_EQ(0, queryGapCounts.internal);
  EXPECT_EQ(0, queryGapCounts.trailing);
  EXPECT_EQ(0, queryGapCounts.total);
}


TEST(CountGaps, QueryIsAllGaps) {
  const auto queryGapCounts = countGaps(toNucleotideSequence("-------"));
  EXPECT_EQ(7, queryGapCounts.leading);
  EXPECT_EQ(0, queryGapCounts.internal);
  EXPECT_EQ(0, queryGapCounts.trailing);
  EXPECT_EQ(7, queryGapCounts.total);
}

TEST(CountGaps, NoGaps) {
  const auto queryGapCounts = countGaps(toNucleotideSequence("GCTAGCGACTGCCATCGCATCGCGGGCATCCGCATCGGCATC"));
  EXPECT_EQ(0, queryGapCounts.leading);
  EXPECT_EQ(0, queryGapCounts.internal);
  EXPECT_EQ(0, queryGapCounts.trailing);
  EXPECT_EQ(0, queryGapCounts.total);
}

TEST(AlignmentParams, QueryHasOnlyInternalGaps) {
  // clang-format off
  const auto ref = toNucleotideSequence("GCTAGCGACTGCCATCGCATCGCGGGCATCCGCATCGGCATC");
  const auto qry = toNucleotideSequence("GCTAGCGACTGCCATCGCA------GCATCCGCATCGGCATC");
  // clang-format on

  const auto refGapCounts = countGaps(ref);
  const auto queryGapCounts = countGaps(qry);

  EXPECT_EQ(0, queryGapCounts.leading);
  EXPECT_EQ(6, queryGapCounts.internal);
  EXPECT_EQ(0, queryGapCounts.trailing);
  EXPECT_EQ(6, queryGapCounts.total);

  const auto alignmentParams = calculateAaAlignmentParams(queryGapCounts, refGapCounts);
  EXPECT_EQ(5, alignmentParams.bandWidth);
  EXPECT_EQ(2, alignmentParams.shift);
}


TEST(AlignmentParams, QueryHasLeadingInternalAndTrailingGaps) {
  // clang-format off
  const auto ref = toNucleotideSequence("GCTAGCGACTGCCATCGCATCGCGGGCATCCGCATCGGCATC");
  const auto qry = toNucleotideSequence("-----CGACTGCCATCGC-------GCATCCGCATCGG----");
  // clang-format on

  const auto refGapCounts = countGaps(ref);
  const auto queryGapCounts = countGaps(qry);

  EXPECT_EQ(5, queryGapCounts.leading);
  EXPECT_EQ(7, queryGapCounts.internal);
  EXPECT_EQ(4, queryGapCounts.trailing);
  EXPECT_EQ(16, queryGapCounts.total);

  const auto alignmentParams = calculateAaAlignmentParams(queryGapCounts, refGapCounts);
  EXPECT_EQ(5, alignmentParams.bandWidth);
  EXPECT_EQ(3, alignmentParams.shift);
}


TEST(AlignmentParams, QueryHasLeadingInternalAndTrailingGapsNonContiguous) {
  // clang-format off
  const auto ref = toNucleotideSequence("GCTAGCGACTGCCATCGCATCGCGGGCATCCGCATCGGCATC");
  const auto qry = toNucleotideSequence("-----CGACTGCCATCG----GC---CATCCGCATCGG----");
  // clang-format on

  const auto refGapCounts = countGaps(ref);
  const auto queryGapCounts = countGaps(qry);

  EXPECT_EQ(5, queryGapCounts.leading);
  EXPECT_EQ(7, queryGapCounts.internal);
  EXPECT_EQ(4, queryGapCounts.trailing);
  EXPECT_EQ(16, queryGapCounts.total);

  const auto alignmentParams = calculateAaAlignmentParams(queryGapCounts, refGapCounts);
  EXPECT_EQ(5, alignmentParams.bandWidth);
  EXPECT_EQ(3, alignmentParams.shift);
}


TEST(AlignmentParams, GeneralCase) {
  // clang-format off
  const auto ref = toNucleotideSequence("GCTAGCGA----CATCGCATCGCGGGCATCC----CGGCATC");
  const auto qry = toNucleotideSequence("-----CGACTGCCATCGC-------GCATCCGCATCGG----");
  // clang-format on

  const auto refGapCounts = countGaps(ref);

  EXPECT_EQ(0, refGapCounts.leading);
  EXPECT_EQ(8, refGapCounts.internal);
  EXPECT_EQ(0, refGapCounts.trailing);
  EXPECT_EQ(8, refGapCounts.total);

  const auto queryGapCounts = countGaps(qry);

  EXPECT_EQ(5, queryGapCounts.leading);
  EXPECT_EQ(7, queryGapCounts.internal);
  EXPECT_EQ(4, queryGapCounts.trailing);
  EXPECT_EQ(16, queryGapCounts.total);

  const auto alignmentParams = calculateAaAlignmentParams(queryGapCounts, refGapCounts);
  EXPECT_EQ(5, alignmentParams.bandWidth);
  EXPECT_EQ(3, alignmentParams.shift);
}
