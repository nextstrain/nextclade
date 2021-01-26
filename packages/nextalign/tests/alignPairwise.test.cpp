#include "../src/align/alignPairwise.h"

#include <gtest/gtest.h>

#include <string>

#include "../src/align/getGapOpenCloseScores.h"
#include "../src/match/matchNuc.h"
#include "./data/sampleGeneMap.h"

const int min_length = 5;

const NextalignOptions options = {
  .gapOpenInFrame = -5,
  .gapOpenOutOfFrame = -6,
  .genes = {},
};

// TODO: this is codon-unaware alignment
const NucleotideSequence dummyRef{100, Nucleotide::GAP};
const std::vector<int> gapOpenClose = getGapOpenCloseScoresFlat(dummyRef, options);
//const std::vector<int> gapOpenClose = getGapOpenCloseScoresCodonAware(dummyRef, sampleGeneMap, options);


TEST(alignPairwise, MatchesIdenticalStrings) {
  std::stringstream input;

  // clang-format off
  const auto qry = toNucleotideSequence("ACGCTCGCT");
  const auto ref = toNucleotideSequence("ACGCTCGCT");
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(27, result.alignmentScore);
  EXPECT_EQ(toString(ref), toString(result.ref));
  EXPECT_EQ(toString(qry), toString(result.query));
}

TEST(alignPairwise, PadsMissingLeft) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(  "CTCGCT"     );
  const auto ref =    toNucleotideSequence(  "ACGCTCGCT"  );
  const auto qryAln = toNucleotideSequence(  "---CTCGCT"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(18, result.alignmentScore);
  EXPECT_EQ(toString(ref), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, PadsMissingLeftSingleMismatch) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(       "TCCAATCA"  );
  const auto ref =    toNucleotideSequence(  "AACAAACCAACCA"  );
  const auto qryAln = toNucleotideSequence(  "-----TCCAATCA"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(16, result.alignmentScore);
  EXPECT_EQ(toString(ref), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, PadsMissingRightSingleMismatch) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(  "CCAATCAT"  );
  const auto ref =    toNucleotideSequence(  "CCAACCAAACAAA"  );
  const auto qryAln = toNucleotideSequence(  "CCAATCAT-----"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(16, result.alignmentScore);
  EXPECT_EQ(toString(ref), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, PadsMissingRightSingleMismatchRevere) {
  std::stringstream input;

  // clang-format off
  const auto ref =    toNucleotideSequence(  "CCGATCAT"  );
  const auto qry =    toNucleotideSequence(  "CCGACCAAACAAA"  );
  const auto refAln = toNucleotideSequence(  "CCGATCAT-----"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(16, result.alignmentScore);
  EXPECT_EQ(toString(qry), toString(result.query));
  EXPECT_EQ(toString(refAln), toString(result.ref));
}

TEST(alignPairwise, PadsMissingLeftSingle) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(   "CGCTCGCT"  );
  const auto ref =    toNucleotideSequence(  "ACGCTCGCT"  );
  const auto qryAln = toNucleotideSequence(  "-CGCTCGCT"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(24, result.alignmentScore);
  EXPECT_EQ(toString(ref), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, PadsMissingLeftMismatch) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(      "TGTTACCTGCGC" );
  const auto ref =    toNucleotideSequence( "AAGGTTTATACCTGCGC" );
  const auto qryAln = toNucleotideSequence( "-----TGTTACCTGCGC" );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(28, result.alignmentScore);
  EXPECT_EQ(toString(ref), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, PadsMissingRight) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(  "ACGCTC"     );
  const auto ref =    toNucleotideSequence(  "ACGCTCGCT"  );
  const auto qryAln = toNucleotideSequence(  "ACGCTC---"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(toString(ref), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, HandlesQueryContainedInRef) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(  "ACGCTC"        );
  const auto ref =    toNucleotideSequence(  "GCCACGCTCGCT"  );
  const auto qryAln = toNucleotideSequence(  "---ACGCTC---"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(toString(ref), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, HandlesRefContainedInQuery) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(  "GCCACGCTCGCT"  );
  const auto ref =    toNucleotideSequence(     "ACGCTC"     );
  const auto refAln = toNucleotideSequence(  "---ACGCTC---"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(toString(refAln), toString(result.ref));
  EXPECT_EQ(toString(qry), toString(result.query));
}

TEST(alignPairwise, AddsGapsWhenOneMismatch) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(  "GCCACTCCCT"    );
  const auto ref =    toNucleotideSequence(  "GCCACGCTCGCT"  );
  const auto qryAln = toNucleotideSequence(  "GCCA--CTCCCT"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(20, result.alignmentScore);
  EXPECT_EQ(toString(ref), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, AddsGapsInRefWhenOneAmbiguousButMatchingChar) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(  "GCCACGCTCRCT"  );
  const auto refAln = toNucleotideSequence(  "GCCA--CTCGCT"  );
  const auto ref =    toNucleotideSequence(  "GCCACTCGCT"    );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(toString(refAln), toString(result.ref));
  EXPECT_EQ(toString(qry), toString(result.query));
}

TEST(alignPairwise, CorrectlyAlignsAmbiguousGapPlacingCase) {
  std::stringstream input;

  // clang-format off
  const auto qry =    toNucleotideSequence(  "ACATCTTC"        );
  const auto ref =    toNucleotideSequence(  "ACATATACTTC"  );
  const auto qryAln = toNucleotideSequence(  "ACAT---CTTC"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(18, result.alignmentScore);
  EXPECT_EQ(toString(ref), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}


TEST(alignPairwise, CorrectlyAlignsAmbiguousGapPlacingCaseReversed) {
  std::stringstream input;

  // clang-format off
   const auto qry =    toNucleotideSequence(  "ACATATACTTG"  );
   const auto refAln = toNucleotideSequence(  "ACAT---CTTG"  );
   const auto ref =    toNucleotideSequence(  "ACATCTTG"        );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(18, result.alignmentScore);
  EXPECT_EQ(toString(refAln), toString(result.ref));
  EXPECT_EQ(toString(qry), toString(result.query));
}

TEST(alignPairwise, CorrectlyAlignsLongComplexQuery) {
  std::stringstream input;

  // clang-format off
   const auto ref =    toNucleotideSequence(  "CTTGGAGGTTCCGTGGCTAGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTGAGCCTTTGT"         );
   const auto qry =    toNucleotideSequence(  "CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATCAAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT"       );
   const auto refAln = toNucleotideSequence(  "CTTGGAGGTTCCGTGGCT----AGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTG---AGCCTTTGT"  );
   const auto qryAln = toNucleotideSequence(  "CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATC-----AAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT"  );
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, min_length);
  EXPECT_EQ(toString(refAln), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}
