#include "../src/translate/translateGenes.h"

#include <gtest/gtest.h>

#include "../src/align/getGapOpenCloseScores.h"

class TranslateGenes : public ::testing::Test {
  NucleotideSequence ref;

protected:
  GeneMap geneMap;
  NextalignOptions options = getDefaultOptions();
  std::vector<int> gapOpenCloseAA;

  TranslateGenes() {
    options.alignment.minimalLength = 3;
    // clang-format off
    //                                      0         10        20        30        40        50        60        70        80        90        100       110       120
    //                                      |         |         |         |         |         |         |         |         |         |         |         |         |
    //                                      01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901
                ref = toNucleotideSequence("AGAAACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
    //                                               |       Gene 1       |          |           Gene 2            |                 |      Gene 3        |
    //                                               xxxxxxxxxxxxxxxxxxxxx           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                  xxxxxxxxxxxxxxxxxxxxx
    //                                                 9                    30       41                            71                99                   120
    // clang-format on

#pragma GCC diagnostic ignored "-Wmissing-field-initializers"
    geneMap = GeneMap{
      {"Gene1", Gene{.geneName = "Gene1", .start = 9, .end = 30, .frame = 0, .length = 21}},
      {"Gene2", Gene{.geneName = "Gene2", .start = 41, .end = 71, .frame = 2, .length = 30}},
      {"Gene3", Gene{.geneName = "Gene3", .start = 99, .end = 120, .frame = 0, .length = 21}},
    };
#pragma GCC diagnostic pop

    gapOpenCloseAA = getGapOpenCloseScoresFlat(ref, options);
  }
};

TEST_F(TranslateGenes, ExtractsAndTranslatesSimpleCase) {
  // clang-format off
  //                                        0         10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |         |         |         |         |         |         |         |         |         |         |         |
  //                                        0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  //            ref = toNucleotideSequence("AGAAACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");

  //                                        0         10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |         |         |         |         |         |         |         |         |         |         |         |
  //                                        0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence("AGAAACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  const auto qryAln = toNucleotideSequence("AGAAACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  //                                                 |       Gene 1       |          |           Gene 2            |                 |      Gene 3        |
  //                                                 xxxxxxxxxxxxxxxxxxxxx           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                  xxxxxxxxxxxxxxxxxxxxx
  //                                                 9                    30       41                            71                99                   120
  // clang-format on

  const auto peptides = translateGenes(qryAln, refAln, geneMap, gapOpenCloseAA, options);

  const auto peptideActual = peptides.queryPeptides[0].seq;
  const auto peptideExpected = toAminoacidSequence("SKFCVI*");
  EXPECT_EQ(peptideActual, peptideExpected);
}

TEST_F(TranslateGenes, DetectsTrailingFrameShift) {
  // clang-format off
  //                                        0         10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |         |         |         |         |         |         |         |         |         |         |         |
  // pos ref                                0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  //            ref = toNucleotideSequence("AGAAACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  // indel                                                 dddd
  //                                        0         10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |         |         |         |         |         |         |         |         |         |         |         |
  // pos aln                                0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence("AGAAACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  const auto qryAln = toNucleotideSequence("AGAAACTGCTCAAAA----GTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  //                                                 |       Gene 1       |          |           Gene 2            |                 |      Gene 3        |
  //                                                 xxxxxxxxxxxxxxxxxxxxx           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                  xxxxxxxxxxxxxxxxxxxxx
  //                                                 9                    30
  // clang-format on

  const auto peptides = translateGenes(qryAln, refAln, geneMap, gapOpenCloseAA, options);

  const auto peptideActual = peptides.queryPeptides[0].seq;
  const auto peptideExpected = toAminoacidSequence("SKXXXXX");
  EXPECT_EQ(peptideActual, peptideExpected);

  const auto frameShiftResult = peptides.queryPeptides[0].frameShiftResults[0];
  const auto frameShiftExpected = FrameShiftResult{
    .geneName = "Gene1",
    .nucRel = {.begin = 10, .end = 21},
    .nucAbs = {.begin = 19, .end = 30},
    .codon = {.begin = 3, .end = 7},
  };
  EXPECT_EQ(frameShiftResult, frameShiftExpected);
}

TEST_F(TranslateGenes, DetectsTrailingFrameShiftWithPriorInsertion) {
  // clang-format off
  //                                        0          10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |          |         |         |         |         |         |         |         |         |         |         |         |
  // pos ref                                0123 456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  //            ref = toNucleotideSequence("AGAA ACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  // indel                                      i           dddd
  //                                        0         10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |         |         |         |         |         |         |         |         |         |         |         |
  // pos aln                                0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence("AGAA-ACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  const auto qryAln = toNucleotideSequence("AGAACACTGCTCAAAA----GTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  //                                                  |       Gene 1       |          |           Gene 2            |                 |      Gene 3        |
  //                                                  xxxxxxxxxxxxxxxxxxxxx           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                  xxxxxxxxxxxxxxxxxxxxx
  //                                                  10                   31
  // clang-format on

  const auto peptides = translateGenes(qryAln, refAln, geneMap, gapOpenCloseAA, options);

  const auto peptideActual = peptides.queryPeptides[0].seq;
  const auto peptideExpected = toAminoacidSequence("SKXXXXX");
  EXPECT_EQ(peptideActual, peptideExpected);

  const auto frameShiftResult = peptides.queryPeptides[0].frameShiftResults[0];
  const auto frameShiftExpected = FrameShiftResult{
    .geneName = "Gene1",
    .nucRel = {.begin = 10, .end = 21},
    .nucAbs = {.begin = 19, .end = 30},
    .codon = {.begin = 3, .end = 7},
  };
  EXPECT_EQ(frameShiftResult, frameShiftExpected);
}

TEST_F(TranslateGenes, DetectsCompensatedFrameShift) {
  // clang-format off
  //                                        0         10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |         |         |         |         |         |         |         |         |         |         |         |
  // pos ref                                0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  //            ref = toNucleotideSequence("AGAAACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  // indel                                                d       dd
  //                                        0         10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |         |         |         |         |         |         |         |         |         |         |         |
  // pos aln                                0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence("AGAAACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  const auto qryAln = toNucleotideSequence("AGAAACTGCTCAA-ATTCTGTG--ATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  //                                                 |       Gene 1       |          |           Gene 2            |                 |      Gene 3        |
  //                                                 xxxxxxxxxxxxxxxxxxxxx           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                  xxxxxxxxxxxxxxxxxxxxx
  //                                                 9                    30
  // clang-format on

  const auto peptides = translateGenes(qryAln, refAln, geneMap, gapOpenCloseAA, options);

  const auto peptideActual = peptides.queryPeptides[0].seq;
  const auto peptideExpected = toAminoacidSequence("-SXXXI*");
  EXPECT_EQ(peptideActual, peptideExpected);

  const auto frameShiftResult = peptides.queryPeptides[0].frameShiftResults[0];
  const auto frameShiftExpected = FrameShiftResult{
    .geneName = "Gene1",
    .nucRel = {.begin = 5, .end = 13},
    .nucAbs = {.begin = 14, .end = 22},
    .codon = {.begin = 1, .end = 4},
  };
  EXPECT_EQ(frameShiftResult, frameShiftExpected);
}

TEST_F(TranslateGenes, DetectsCompensatedFrameShiftWithPriorInsertion) {
  // clang-format off
  //                                        0          10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |          |         |         |         |         |         |         |         |         |         |         |         |
  // pos ref                                0123 456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  //            ref = toNucleotideSequence("AGAA ACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  // indel                                      i         d       dd
  //                                        0         10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |         |         |         |         |         |         |         |         |         |         |         |
  // pos aln                                0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence("AGAA-ACTGCTCAAAATTCTGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  const auto qryAln = toNucleotideSequence("AGAACACTGCTCAA-ATTCTGTG--ATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  //                                                  |       Gene 1       |          |           Gene 2            |                 |      Gene 3        |
  //                                                  xxxxxxxxxxxxxxxxxxxxx           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                  xxxxxxxxxxxxxxxxxxxxx
  //                                                  10                   31
  // clang-format on

  const auto peptides = translateGenes(qryAln, refAln, geneMap, gapOpenCloseAA, options);

  const auto peptideActual = peptides.queryPeptides[0].seq;
  const auto peptideExpected = toAminoacidSequence("-SXXXI*");
  EXPECT_EQ(peptideActual, peptideExpected);

  const auto frameShiftResult = peptides.queryPeptides[0].frameShiftResults[0];
  const auto frameShiftExpected = FrameShiftResult{
    .geneName = "Gene1",
    .nucRel = {.begin = 5, .end = 13},
    .nucAbs = {.begin = 14, .end = 22},
    .codon = {.begin = 1, .end = 4},
  };
  EXPECT_EQ(frameShiftResult, frameShiftExpected);
}


TEST_F(TranslateGenes, DetectsCompensatedFrameShiftWithInsertion) {
  // clang-format off
  //                                        0         10         20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |          |         |         |         |         |         |         |         |         |         |         |
  // pos ref                                012345678901234567 8901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  //            ref = toNucleotideSequence("AGAAACTGCTCAAAATTC TGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  // indel                                                d   i   dd
  //                                        0         10        20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |         |         |         |         |         |         |         |         |         |         |         |
  // pos aln                                0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  const auto refAln = toNucleotideSequence("AGAAACTGCTCAAAATTC-TGTGTGATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  const auto qryAln = toNucleotideSequence("AGAAACTGCTCAA--TTCCTGTG--ATATGAACAGAAGGCCGCTATAACAATACTACATGGAATTTCACTAGATTCACTGAGACTCATTGATGCTATGATGTTCACATTAGATTTGGCTAC");
  //                                                 |       Gene 1       |          |           Gene 2            |                 |      Gene 3        |
  //                                                 xxxxxxxxx xxxxxxxxxxx           xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                  xxxxxxxxxxxxxxxxxxxxx
  //                                                 9                   31
  // clang-format on
  //                                        0         10         20        30        40        50        60        70        80        90        100       110       120
  //                                        |         |          |         |         |         |         |         |         |         |         |         |         |
  // coord map reverse                      01234567890123456778901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890
  //                                                         ^^

  const auto peptides = translateGenes(qryAln, refAln, geneMap, gapOpenCloseAA, options);

  const auto peptideActual = peptides.queryPeptides[0].seq;
  const auto peptideExpected = toAminoacidSequence("-SXXXI*");
  EXPECT_EQ(peptideActual, peptideExpected);

  const auto frameShiftResult = peptides.queryPeptides[0].frameShiftResults[0];
  const auto frameShiftExpected = FrameShiftResult{
    .geneName = "Gene1",
    .nucRel = {.begin = 6, .end = 14},
    .nucAbs = {.begin = 15, .end = 22},
    .codon = {.begin = 2, .end = 4},
  };
  EXPECT_EQ(frameShiftResult, frameShiftExpected);
}
