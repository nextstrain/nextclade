#include <gtest/gtest.h>

#include <string>

#include "../src/align/alignPairwise.h"
#include "../src/align/getGapOpenCloseScores.h"
#include "../src/match/matchNuc.h"


class DetectFrameShifts : public ::testing::Test {
protected:
  NextalignOptions options = getDefaultOptions();
  std::vector<int> gapOpenClose;

  DetectFrameShifts() {
    options.alignment.minimalLength = 3;
    const NucleotideSequence dummyRef{100, Nucleotide::GAP};
    gapOpenClose = getGapOpenCloseScoresFlat(dummyRef, options);
  }
};


TEST_F(DetectFrameShifts, CorrectlyDetectsFrameShiftsInLongComplexQuery) {
  std::stringstream input;

  // clang-format off
  // refAln index (tens)                     000000000011111111   1122   222222223333333333444444444455   55555   55566666666667777777777888   888   888899999
  // refAln index (ones)                     012345678901234567   8901   234567890123456789012345678901   23456   78901234567890123456789012   345   678901234
  const auto ref =    toNucleotideSequence( "CTTGGAGGTTCCGTGGCT"        "AGATAACAGAACATTCTTGGAATGCTGATC" "TTTAT" "AAGCTCATGCGACACTTCGCATGGTG"       "AGCCTTTGT" );
  const auto qry =    toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAA" "AGATAACAGAACATTCTTGGAATGCTGATC"         "AAGCTCATGGGACANNNNNCATGGTG" "GAC" "AGCCTTTGT" );
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "----" "AGATAACAGAACATTCTTGGAATGCTGATC" "TTTAT" "AAGCTCATGCGACACTTCGCATGGTG" "---" "AGCCTTTGT" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAA" "AGATAACAGAACATTCTTGGAATGCTGATC" "-----" "AAGCTCATGGGACANNNNNCATGGTG" "GAC" "AGCCTTTGT" );
  // frame shift amount                                           1201   111111111111111111111111111111   20120                                120
  // frame shift ranges                                           xxxx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   xxxxx                                xxx
  //                                                              ^                                            ^                               ^  ^
  //                                                              18                                          57                               83 86
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, options.alignment, options.seedNuc);

  const auto& actual = result.result->frameShifts;
  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 0, .end = 0},
  };

  // This is unrelated to the tested functionality, but we just want to make sure that the alignment is indeed what we expect
  EXPECT_EQ(toString(refAln), toString(result.result->ref));
  EXPECT_EQ(toString(qryAln), toString(result.result->query));

  EXPECT_EQ(actual, expected);
}
