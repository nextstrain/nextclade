#include <gtest/gtest.h>
#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>

#include <string>

#include "../src/align/getGapOpenCloseScores.h"
#include "../src/translate/detectFrameShifts.h"


TEST(DetectFrameShifts, DetectsNoShiftsIfEmpty) {
  // clang-format off
  const auto refAln = toNucleotideSequence( "" );
  const auto qryAln = toNucleotideSequence( "" );
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftsIfnoIndels) {
  // clang-format off
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftsIf3xDelsetionsAdjacent) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTAT---TAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                       ddd
  // frame                                                       120
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftsIfDeletionsAreModulo3Adjacent) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCG---CTATAGATAACAGAACA---TTGGAATGCTGATC" );
  // indel                                                ddd                 ddd
  // frame                                                120                 120
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftsIfDeletionsAreModulo3Adjacent2) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCG------TAGATAACAGAACA---TTGGAATGCTGATC" );
  // indel                                                dddddd              ddd
  // frame                                                120120              120
  // clang-format on
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftsIf3xInsertionsAdjacent) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTAT---TAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                       iii
  // frame                                                       210
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftsIfInsertionsAreModulo3Adjacent) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCG---CTATAGATAACAGAACA---TTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                iii                 iii
  // frame                                                210                 210
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftsIfInsertionsAreModulo3Adjacent2) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCG------TAGATAACAGAACA---TTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                iiiiii              iii
  // frame                                                210210              210
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftsIfDeletionsAndInsertionsAreModulo3AndAdjacent) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGG---TAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCG---CTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                dddiii
  // frame                                                120210
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftsIfInsertionsAndDeletionsAreModulo3AndAdjacent) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCG---CTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGG---TAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                iiiddd
  // frame                                                210120
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueTo1xDeletion) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT-TAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                     d
  // frame                                                     11111111111111111111111111111111
  // frame shift ranges                                         xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                            ^                              ^
  //                                                            19                             50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 19, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xAdjacentDeletions) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT--AGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                     dd
  // frame                                                     12222222222222222222222222222222
  // frame shift ranges                                          xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                             ^                             ^
  //                                                             20                            50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 20, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsCompensatedShiftDueTo2Deletions) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT--AGATAACAGAA-ATTCTTGGAATGCTGATC" );
  // indel                                                     dd           d
  // frame                                   00000000000000000012222222222220000000000000000000
  // frame shift ranges                                          xxxxxxxxxxx
  //                                                             ^          ^
  //                                                             20         31
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 20, .end = 31},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsCompensatedShiftDueTo3Deletions) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT-TAGAT-ACAGAA-ATTCTTGGAATGCTGATC" );
  // indel                                                     d     d      d
  // frame                                   00000000000000000011111122222220000000000000000000
  // frame shift ranges                                         xxxxxxxxxxxx
  //                                                            ^           ^
  //                                                            19          31
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 19, .end = 31},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueToDeletionLeading) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "-TTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                   d
  // frame                                   12222222222222222222222222222222222222222222222222
  // frame shift ranges                       xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                          ^                                                ^
  //                                          1                                               50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 1, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xDeletionsAdjacentLeading) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "--TGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                   dd
  // frame                                   12222222222222222222222222222222222222222222222222
  // frame shift ranges                        xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                           ^                                               ^
  //                                           2                                               50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 2, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xDeletionsLeading) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "-TTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                   d
  // frame                                   12222222222222222222222222222222222222222222222222
  // frame shift ranges                       xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                          ^                                                ^
  //                                          1                                               50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 1, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftDueTo2xAdjacentDeletionsTrailing) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGA--" );
  // indel                                                                                   dd
  // frame                                   00000000000000000000000000000000000000000000000012
  // frame shift ranges                                                                      xx
  //                                                                                         ^ ^
  //                                                                                        48 50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueTo1xInsertion) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT-TAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                     i
  // frame                                                     22222222222222222222222222222222
  // frame shift ranges                                         xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                            ^                              ^
  //                                                            19                            50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 19, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xAdjacentInsertions) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT--AGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                     ii
  // frame                                                     12222222222222222222222222222222
  // frame shift ranges                                          xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                             ^                             ^
  //                                                             20                            50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 20, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsCompensatedShiftDueTo2Insertions) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT--AGATAACAGAA-ATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                     ii           i
  // frame                                   00000000000000000012222222222220000000000000000000
  // frame shift ranges                                          xxxxxxxxxxx
  //                                                             ^          ^
  //                                                            20          31
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 20, .end = 31},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsCompensatedShiftDueTo3Insertions) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT-TAGAT-ACAGAA-ATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                     i     i      i
  // frame                                   00000000000000000011111122222220000000000000000000
  // frame shift ranges                                         xxxxxxxxxxxx
  //                                                            ^           ^
  //                                                            19          31
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 19, .end = 31},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueToInsertionLeading) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "-TTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                   i
  // frame                                   12222222222222222222222222222222222222222222222222
  // frame shift ranges                       xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                          ^                                                ^
  //                                          1                                               50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 1, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xInsertionsAdjacentLeading) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "--TGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                   ii
  // frame                                   12222222222222222222222222222222222222222222222222
  // frame shift ranges                        xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //
  //                                           ^                                               ^
  //                                           2                                               50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 2, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xInsertionsLeading) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "-TTGGAGGTTCCGTG-CTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                   i              i
  // frame                                   12222222222222222222222222222222222222222222222222
  // frame shift ranges                       xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                          ^                                                ^
  //                                          1                                               50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 1, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftDueToInsertionTrailing) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGAT-" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                                                    i
  // frame                                   00000000000000000000000000000000000000000000000012
  // frame shift ranges
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsNoShiftDueTo2xInsertionsAdjacentTrailing) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGA--" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                                                   ii
  // frame                                   00000000000000000000000000000000000000000000000012
  // frame shift ranges
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {};

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsCompensatedShiftDueToInsertionAndDeletion) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT-TAGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAA-ATTCTTGGAATGCTGATC" );
  // indel                                                     i            d
  // frame                                   00000000000000000011111111111110000000000000000000
  // frame shift ranges                                         xxxxxxxxxxxx
  //                                                            ^           ^
  //                                                            19          31
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 19, .end = 31},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsCompensatedShiftDueTo2xInsertionsAnd2xDeletions) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT--AGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGA--ATTCTTGGAATGCTGATC" );
  // indel                                                     ii          dd
  // frame                                   00000000000000000012222222222210000000000000000000
  // frame shift ranges                                          xxxxxxxxxx
  //                                                             ^         ^
  //                                                             20        30
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 20, .end = 30},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, DetectsUncompensatedShiftDueTo2xInsertionsAnd1xDeletion) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT--AGATAACAGAACATTCTTGGAATGCTGATC" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAGATAACAGAA-ATTCTTGGAATGCTGATC" );
  // indel                                                     ii           d
  // frame                                                     122222222222111111111111111111111
  // frame shift ranges                                          xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                             ^                              ^
  //                                                            20                              50
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 20, .end = 50},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, CorrectlyHandlesComplexCase1) {
  // clang-format off
  //                                         0         10        20        30        40        50        60        70        80        90
  //                                         |         |         |         |         |         |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATC-----AAGCTCATGCGACACTTCGCATGGTG---AGCCTTTGT" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT----AGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT" );
  // indel                                                     dddd                              iiiii                          iii
  // frame                                                     12011111111111111111111111111111110210222222222222222222222222222102222222222
  // frame shift ranges                                            xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                               ^                                                                        ^
  //                                                              22                                                                        95
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 22, .end = 95},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, CorrectlyHandlesComplexCase2) {
  // clang-format off
  //                                         0         10        20        30        40        50        60        70        80        90
  //                                         |         |         |         |         |         |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345
  const auto refAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT----AGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTG---AGCCTTTGT" );
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATC-----AAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT" );
  // indel                                                     iiii                              ddddd                          iii
  // frame                                                     210111111111111111111111111111111120120                          210
  // frame shift ranges                                            xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                               ^                                                                        ^
  //                                                              22                                                                        95
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 22, .end = 95},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, CorrectlyHandlesComplexCase3) {
  // clang-format off
  //                                         0         10        20        30        40        50        60        70        80        90
  //                                         |         |         |         |         |         |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345
  const auto refAln = toNucleotideSequence( "CTTGGAGGT--C-TGGCTATA" );
  const auto qryAln = toNucleotideSequence( "CTTGG-GGTTCCG--GCTATA" );
  // indel
  // frame                                        1111022120
  // frame shift                                   xxxxxx
  //                                               ^     ^
  //                                               6     12
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 6, .end = 12},
  };

  EXPECT_EQ(actual, expected);
}

TEST(DetectFrameShifts, CorrectlyHandlesComplexCase4) {
  // clang-format off
  //                                         0         10        20        30        40        50        60        70        80        90
  //                                         |         |         |         |         |         |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345
  const auto refAln = toNucleotideSequence( "CTTGGAGGT--C-TGGCTATAAAG-TAACAGAACATT-TTGGAATGCTG---TTTATAAG-TCATGC---ACTTCGCATGGTG---AGCCTTTGT" );
  const auto qryAln = toNucleotideSequence( "CTTGG-GGTTCCG--GCTATAAA-ATAACAGA-CATTCTTGGAA-GCTGATCTTTA-AAGCTCATGGGACANNNNNC--GGTGGACAGCC-TTGT" );
  // indel                                        d   ii idd        di       d    i      d    iii    d   i      iii       dd    iii    d
  // frame                                        1111022120        10       111110      11111021111122221111111021111111120    210    11111
  // frame shift                                   xxxxxx                     xxxx        xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx              xxxx
  //                                               ^     ^                    ^   ^       ^                               ^             ^   ^
  //                                               6     12                   33  37      45                              77           91   95
  // clang-format on

  const auto actual = detectFrameShifts(refAln, qryAln);

  const safe_vector<Range> expected = {
    Range{.begin = 6, .end = 12},
    Range{.begin = 33, .end = 37},
    Range{.begin = 45, .end = 77},
    Range{.begin = 91, .end = 95},
  };

  EXPECT_EQ(actual, expected);
}
