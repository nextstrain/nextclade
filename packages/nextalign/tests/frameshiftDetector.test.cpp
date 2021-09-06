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

TEST_F(DetectFrameShifts, DetectsNoShiftsIf3xDelsAdjacent) {
  std::stringstream input;

  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTAT---TAACAGAACATTCTTGGAATGCTGATC" );
  // frame                                   00000000000000000000120000000000000000000000000000
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST_F(DetectFrameShifts, DetectsNoShiftsIfDeletaionsAreModulo3) {
  std::stringstream input;

  // clang-format off
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCG---CTATAGATAACAGAACA---TTGGAATGCTGATC" );
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST_F(DetectFrameShifts, DetectsNoShiftsIfDeletaionsAreModulo3Adjacent) {
  std::stringstream input;

  // clang-format off
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCG------TAGATAACAGAACA---TTGGAATGCTGATC" );
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {};

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsNoShiftsIf3xInsertionsAdjacent) {
  std::stringstream input;

  // clang-format off
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTAT---TAACAGAACATTCTTGGAATGCTGATC" );
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {};

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsNoShiftsIfInsertionsAreModulo3) {
  std::stringstream input;

  // clang-format off
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCG---CTATAGATAACAGAACA---TTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST_F(DetectFrameShifts, DetectsNoShiftsIfInsertionsAreModulo3Adjacent) {
  std::stringstream input;

  // clang-format off
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCG---CTATAGATAACAGAACA---TTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {};

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsUncompensatedShiftDueTo1xDeletion) {
  std::stringstream input;

  // clang-format off
  //                                                   10           20        30        40        50
  //                                                   |            |         |         |         |
  //                                         012345678901234567   890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "ATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT" "-TAGATAACAGAACATTCTTGGAATGCTGATC" );
  // frame                                                        11111111111111111111111111111111
  // frame shift ranges                                            xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                               ^                              ^
  //                                                               19                             50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 19, .end = 50},
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
  // frame shift ranges                                             xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //
  //                                                                ^                             ^
  //                                                                20                            50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 20, .end = 50},
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
  // frame shift ranges                                             xxxxxxxxxxx
  //                                                                ^          ^
  //                                                                20         31
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 20, .end = 31},
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
  // frame shift ranges                                            xxxxxxxxxxxx
  //                                                               ^           ^
  //                                                               19          31
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 19, .end = 31},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xAdjacentDeletionsLeading) {
  std::stringstream input;

  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "--TGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // frame                                   12222222222222222222222222222222222222222222222222
  // frame shift ranges                        xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                           ^                                               ^
  //                                           2                                               50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 2, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsNoShiftDueTo2xAdjacentDeletionsTrailing) {
  std::stringstream input;

  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGA--" );
  // frame                                   00000000000000000000000000000000000000000000000012
  // frame shift ranges                                                                      xx
  //                                                                                         ^  ^
  //                                                                                         48 50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {};

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
  // frame                                                        22222222222222222222222222222222
  // frame shift ranges                                            xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //
  //                                                               ^                             ^
  //                                                               19                            50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 19, .end = 50},
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
  // frame shift ranges                                             xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                                ^                             ^
  //                                                                20                            50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 20, .end = 50},
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
  // frame shift ranges                                             xxxxxxxxxxx
  //                                                                ^          ^
  //                                                               20          31
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 20, .end = 31},
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
  // frame shift ranges                                            xxxxxxxxxxxx
  //                                                               ^           ^
  //                                                               19          31
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 19, .end = 31},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xAdjacentInsertionsLeading) {
  std::stringstream input;

  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "--TGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // frame                                   12222222222222222222222222222222222222222222222222
  // frame shift ranges                        xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //
  //                                           ^                                               ^
  //                                           2                                               50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 2, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsNoShiftDueTo2xAdjacentInsertionsTrailing) {
  std::stringstream input;

  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGA--" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // frame                                   00000000000000000000000000000000000000000000000012
  // frame shift ranges
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {};

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
  // frame shift ranges                                            xxxxxxxxxxxx
  //                                                               ^           ^
  //                                                               19          31
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 19, .end = 31},
  };

  EXPECT_EQ(actual, expected);
}

TEST_F(DetectFrameShifts, DetectsCompensatedShiftDueTo2xInsertionsAnd2xDeletions) {
  std::stringstream input;

  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT--AGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGA--ATTCTTGGAATGCTGATC" );
  // frame                                   00000000000000000012222222222210000000000000000000
  // frame shift ranges                                          xxxxxxxxxx
  //                                                             ^         ^
  //                                                             20        30
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 20, .end = 30},
  };

  EXPECT_EQ(actual, expected);
}


TEST_F(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xInsertionsAnd1xDeletion) {
  std::stringstream input;

  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT--AGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAA-ATTCTTGGAATGCTGATC" );
  // frame                                   000000000000000000122222222222111111111111111111111
  // frame shift ranges                                          xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                             ^                              ^
  //                                                            20                              50
  // clang-format on

  const auto result = detectFrameShifts(refAln, qryAln);
  const auto& actual = result.frameShifts;

  const std::vector<FrameShiftRange> expected = {
    FrameShiftRange{.begin = 20, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

//TEST_F(DetectFrameShifts, CorrectlyDetectsFrameShiftsInLongComplexQuery1) {
//  std::stringstream input;
//
//  // clang-format off
//  //                                         0         10        20        30        40        50        60        70        80        90
//  //                                         |         |         |         |         |         |         |         |         |         |
//  //                                         012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345
//  const auto ref =    toNucleotideSequence( "CTTGGAGGTTCCGTGGCT    AGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTG   AGCCTTTGT" );
//  const auto qry =    toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATC     AAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT" );
//  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT----AGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTG---AGCCTTTGT" );
//  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATC-----AAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT" );
//  // frame shift amount                                        120111111111111111111111111111111110210                          120
//  // frame shift ranges                                        xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                          xxx
//  //                                                           ^                                ^
//  //                                                           18                               58
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
