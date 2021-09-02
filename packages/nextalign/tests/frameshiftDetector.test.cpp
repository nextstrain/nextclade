#include <gtest/gtest.h>
#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>

#include <string>

#include "../src/align/getGapOpenCloseScores.h"
#include "../src/translate/detectFrameShifts.h"


class DetectFrameShifts : public ::testing::Test {
protected:
  NextalignOptions options = getDefaultOptions();

  DetectFrameShifts() {
    options.alignment.minimalLength = 3;
  }
};

TEST_F(DetectFrameShifts, DetectsNoShiftsIfNoIndels) {
  std::stringstream input;

  // clang-format off
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCMGTGGCTATAGATAANNNNNNNTTCTTGGAATGCTGATC" );
  //                                                    M              NNNNNNN
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {};

  EXPECT_EQ(actual, expected);
}

//TEST_F(DetectFrameShifts, DetectsNoShiftsIf3xDelsAdjacent) {
//  std::stringstream input;
//
//  // clang-format off
//  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
//  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTAT---TAACAGAACATTCTTGGAATGCTGATC" );
//  // clang-format on
//
//  const auto result = detectFrameShifts(refAln, qryAln);
//  const auto& actual = result.frameShifts;
//
//  const std::vector<FrameShiftRange> expected = {};
//
//  EXPECT_EQ(actual, expected);
//}
//
//
//TEST_F(DetectFrameShifts, DetectsNoShiftsIfDeletaionsAreModulo3) {
//  std::stringstream input;
//
//  // clang-format off
//  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
//  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCG---CTATAGATAACAGAACA---TTGGAATGCTGATC" );
//  // clang-format on
//
//  const auto result = detectFrameShifts(refAln, qryAln);
//  const auto& actual = result.frameShifts;
//
//  const std::vector<FrameShiftRange> expected = {};
//
//  EXPECT_EQ(actual, expected);
//}
//
//
//TEST_F(DetectFrameShifts, DetectsNoShiftsIf3xInsertionsAdjacent) {
//  std::stringstream input;
//
//  // clang-format off
//  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
//  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTAT---TAACAGAACATTCTTGGAATGCTGATC" );
//  // clang-format on
//
//  const auto result = detectFrameShifts(refAln, qryAln);
//  const auto& actual = result.frameShifts;
//
//  const std::vector<FrameShiftRange> expected = {};
//
//  EXPECT_EQ(actual, expected);
//}
//
//
//TEST_F(DetectFrameShifts, DetectsNoShiftsIfInsertionsAreModulo3) {
//  std::stringstream input;
//
//  // clang-format off
//  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCG---CTATAGATAACAGAACA---TTGGAATGCTGATC" );
//  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
//  // clang-format on
//
//  const auto result = detectFrameShifts(refAln, qryAln);
//  const auto& actual = result.frameShifts;
//
//  const std::vector<FrameShiftRange> expected = {};
//
//  EXPECT_EQ(actual, expected);
//}


TEST_F(DetectFrameShifts, DetectsUncompensatedShiftDueTo1xDeletion) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30        40        50
  //                                                   |            |         |         |         |
  //                                         012345678901234567   890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "-TAGATAACAGAACATTCTTGGAATGCTGATC" );
  // frame                                                        11111111111111111111111111111111
  // frame shift ranges                                           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //
  //                                                              ^                               ^
  //                                                             18                               50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST_F(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xAdjacentDeletions) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30        40        50
  //                                                   |            |         |         |         |
  //                                         012345678901234567   890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "--AGATAACAGAACATTCTTGGAATGCTGATC" );
  // frame                                                        12222222222222222222222222222222
  // frame shift ranges                                           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //
  //                                                              ^                               ^
  //                                                             18                               50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST_F(DetectFrameShifts, DetectsCompensatedShiftDueTo2Deletions) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30           40        50
  //                                                   |            |         |            |         |
  //                                         012345678901234567   89012345678901   2345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAAC" "ATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "--AGATAACAGAA-" "ATTCTTGGAATGCTGATC" );
  // frame                                   000000000000000000   12222222222220   000000000000000000
  // frame shift ranges                                           xxxxxxxxxxxxxx
  //                                                              ^             ^
  //                                                             18             32
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 32},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsCompensatedShiftDueTo3Deletions) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30           40        50
  //                                                   |            |         |            |         |
  //                                         012345678901234567   89012345678901   2345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAAC" "ATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "-TAGAT-ACAGAA-" "ATTCTTGGAATGCTGATC" );
  // frame                                   000000000000000000   11111122222220   000000000000000000
  // frame shift ranges                                           xxxxxxxxxxxxxx
  //                                                              ^             ^
  //                                                             18             32
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 32},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsUncompensatedShiftDueTo1xInsertion) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30        40        50
  //                                                   |            |         |         |         |
  //                                         012345678901234567   890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "-TAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // frame                                                        11111111111111111111111111111111
  // frame shift ranges                                           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //
  //                                                              ^                               ^
  //                                                             18                               50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST_F(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xAdjacentInsertions) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30        40        50
  //                                                   |            |         |         |         |
  //                                         012345678901234567   890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "--AGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // frame                                                        12222222222222222222222222222222
  // frame shift ranges                                           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //
  //                                                              ^                               ^
  //                                                             18                               50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST_F(DetectFrameShifts, DetectsCompensatedShiftDueTo2Insertions) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30           40        50
  //                                                   |            |         |            |         |
  //                                         012345678901234567   89012345678901   2345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "--AGATAACAGAA-" "ATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAAC" "ATTCTTGGAATGCTGATC" );
  // frame                                   000000000000000000   12222222222220   000000000000000000
  // frame shift ranges                                           xxxxxxxxxxxxxx
  //                                                              ^             ^
  //                                                             18             32
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 32},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsCompensatedShiftDueTo3Insertions) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30           40        50
  //                                                   |            |         |            |         |
  //                                         012345678901234567   89012345678901   2345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "-TAGAT-ACAGAA-" "ATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAAC" "ATTCTTGGAATGCTGATC" );
  // frame                                   000000000000000000   11111122222220   000000000000000000
  // frame shift ranges                                           xxxxxxxxxxxxxx
  //                                                              ^             ^
  //                                                             18             32
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 32},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsCompensatedShiftDueToInsertionAndDeletion) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30           40        50
  //                                                   |            |         |            |         |
  //                                         012345678901234567   89012345678901   2345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "-TAGATAACAGAAC" "ATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAA-" "ATTCTTGGAATGCTGATC" );
  // frame                                   000000000000000000   11111111111110   000000000000000000
  // frame shift ranges                                           xxxxxxxxxxxxxx
  //                                                              ^             ^
  //                                                             18             32
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 32},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsCompensatedShiftDueTo2xInsertionsAnd2xDeletions) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30           40        50
  //                                                   |            |         |            |         |
  //                                         012345678901234567   89012345678901   2345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "--AGATAACAGAAC" "ATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGA--" "ATTCTTGGAATGCTGATC" );
  // frame                                   000000000000000000   12222222222210   000000000000000000
  // frame shift ranges                                           xxxxxxxxxxxxxx
  //                                                              ^             ^
  //                                                             18             32
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 32},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xInsertionsAnd1xDeletion) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30           40        50
  //                                                   |            |         |            |         |
  //                                         012345678901234567   89012345678901   2345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "--AGATAACAGAAC" "ATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAA-" "ATTCTTGGAATGCTGATC" );
  // frame                                   000000000000000000   12222222222211   111111111111111111
  // frame shift ranges                                           xxxxxxxxxxxxxx
  //                                                              ^                                  ^
  //                                                             18                                  50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 18, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}


//TEST_F(DetectFrameShifts, CorrectlyDetectsFrameShiftsInLongComplexQuery1) {
//  std::stringstream input;
//
//  // clang-format off
//  const auto ref =    toNucleotideSequence( "CTTGGAGGTTCCGTGGCT"        "AGATAACAGAACATTCTTGGAATGCTGATC" "TTTAT" "AAGCTCATGCGACACTTCGCATGGTG"       "AGCCTTTGT" );
//  const auto qry =    toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAA" "AGATAACAGAACATTCTTGGAATGCTGATC"         "AAGCTCATGGGACANNNNNCATGGTG" "GAC" "AGCCTTTGT" );
//  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "----" "AGATAACAGAACATTCTTGGAATGCTGATC" "TTTAT" "AAGCTCATGCGACACTTCGCATGGTG" "---" "AGCCTTTGT" );
//  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAA" "AGATAACAGAACATTCTTGGAATGCTGATC" "-----" "AAGCTCATGGGACANNNNNCATGGTG" "GAC" "AGCCTTTGT" );
//  // qryAln pos (tens)                       000000000011111111   1122   222222223333333333444444444455           55555555666666666677777777   778   888888888
//  // qryAln pos (ones)                       012345678901234567   8901   234567890123456789012345678901           23456789012345678901234567   890   123456789
//  //
//  // frame shift amount                                           1201   111111111111111111111111111111   10210                                120
//  // frame shift ranges                                           xxxx   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   xxxxx                                xxx
//  //                                                              ^                                   ^
//  //                                                              18                                  58
//  // clang-format on
//
//  const auto result = detectFrameShifts(refAln, qryAln);
//  const auto& actual = result.frameShifts;
//
//  const std::vector<FrameShiftRange> expected = {
//    FrameShiftRange{.begin = 0, .end = 0},
//  };
//
//  EXPECT_EQ(actual, expected);
//}
