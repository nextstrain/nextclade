#include <gtest/gtest.h>
#include <nextalign/nextalign.h>
#include <nextalign/private/nextalign_private.h>

#include <string>

#include "../src/align/getGapOpenCloseScores.h"
#include "../src/translate/detectFrameShifts.h"


TEST(FindMask, ZeroIfEmptyLeading) {
  const auto seq = toNucleotideSequence("");
  const Range frameShiftNucRangeRel = {.begin = 0, .end = 0};
  const auto begin = findMaskEnd(seq, frameShiftNucRangeRel);
  EXPECT_EQ(begin, 0);
}

TEST(FindMask, ZeroIfEmptyTrailing) {
  const auto seq = toNucleotideSequence("");
  const Range frameShiftNucRangeRel = {.begin = 0, .end = 0};
  const auto end = findMaskEnd(seq, frameShiftNucRangeRel);
  EXPECT_EQ(end, 0);
}

TEST(FindMask, Detects1xDeletionLeading) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT-TAGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                     d
  // frame                                                     11111111111111111111111111111111
  // frame shift ranges                                         xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                            ^                              ^
  //                                                            19                             50
  // clang-format on

  const Range frameShiftNucRangeRel = {.begin = 19, .end = 50};
  const auto begin = findMaskBegin(qryAln, frameShiftNucRangeRel);
  EXPECT_EQ(begin, 18);
}

TEST(FindMask, Detects2xDeletionLeading) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT--AGATAACAGAACATTCTTGGAATGCTGATC" );
  // indel                                                     dd
  // frame                                                     12222222222222222222222222222222
  // frame shift ranges                                          xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //                                                             ^                             ^
  //                                                             20                            50
  // clang-format on

  const Range frameShiftNucRangeRel = {.begin = 20, .end = 50};
  const auto begin = findMaskBegin(qryAln, frameShiftNucRangeRel);
  EXPECT_EQ(begin, 18);
}


TEST(FindMask, Detects2xDeletionLeading1xTralingAroundCompensatedShift) {
  // clang-format off
  //                                                   10        20        30        40        50
  //                                                   |         |         |         |         |
  //                                         012345678901234567890123456789012345678901234567890
  const auto qryAln = toNucleotideSequence( "CTTGGAGGTTCCGTGGCT--AGATAACAGAA-ATTCTTGGAATGCTGATC" );
  // indel                                                     dd           d
  // frame                                   00000000000000000012222222222220000000000000000000
  // frame shift ranges                                          xxxxxxxxxxx
  //                                                             ^          ^
  //                                                             20         31
  // clang-format on

  const Range frameShiftNucRangeRel = {.begin = 20, .end = 31};
  const auto begin = findMaskBegin(qryAln, frameShiftNucRangeRel);
  const auto end = findMaskEnd(qryAln, frameShiftNucRangeRel);
  EXPECT_EQ(begin, 18);
  EXPECT_EQ(end, 32);
}
