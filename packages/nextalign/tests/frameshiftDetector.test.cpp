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
  const auto ref =    toNucleotideSequence( "CTTGGAGGTTCCGTGGCT"        "AGATAACAGAACATTCTTGGAATGCTGATC" "TTTAT" "AAGCTCATGCGACACTTCGCATGGTG"       "AGCCTTTGT" );
  const auto qry =    toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAA" "AGATAACAGAACATTCTTGGAATGCTGATC"         "AAGCTCATGGGACANNNNNCATGGTG" "GAC" "AGCCTTTGT" );
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "----" "AGATAACAGAACATTCTTGGAATGCTGATC" "TTTAT" "AAGCTCATGCGACACTTCGCATGGTG" "---" "AGCCTTTGT" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAA" "AGATAACAGAACATTCTTGGAATGCTGATC" "-----" "AAGCTCATGGGACANNNNNCATGGTG" "GAC" "AGCCTTTGT" );
  // qryAln pos (tens)                       000000000011111111   1122   222222223333333333444444444455           55555555666666666677777777   778   888888888
  // qryAln pos (ones)                       012345678901234567   8901   234567890123456789012345678901           23456789012345678901234567   890   123456789
  //
  // frame shift amount                                           1201   111111111111111111111111111111   10210                                120
  // frame shift ranges                                           xxxx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   xxxxx                                xxx
  //                                                              ^                                   ^
  //                                                              18                                  58
  // clang-format on

  const auto result = alignPairwise(qry, ref, gapOpenClose, options.alignment, options.seedNuc);

  const auto& actual = result.result->frameShifts;
  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 58},
  };

  // This is unrelated to the tested functionality, but we just want to make sure that the alignment is indeed what we expect
  EXPECT_EQ(toString(refAln), toString(result.result->ref));
  EXPECT_EQ(toString(qryAln), toString(result.result->query));

  EXPECT_EQ(actual, expected);
}
