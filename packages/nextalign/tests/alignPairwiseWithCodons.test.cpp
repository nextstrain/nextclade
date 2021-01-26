#include <gtest/gtest.h>

#include <string>

#include "../src/align/alignPairwise.h"
#include "../src/align/getGapOpenCloseScores.h"
#include "../src/match/matchNuc.h"

const int min_length = 5;

TEST(alignPairwise, AlignsCodonGapsQuery) {
  const NextalignOptions options = {
    .gapOpenInFrame = -5,
    .gapOpenOutOfFrame = -6,
    .genes = {"Gene 1"},
  };

  GeneMap geneMap = {//
    {"Gene 1",       //
      Gene{
        .geneName = "Gene1",
        .start = 2,
        .end = 20,
        .strand = "+",
        .frame = 0,
        .length = 18,
      }}};


  // clang-format off
  const auto ref =    toNucleotideSequence(  "GCATGAGGAATCTCAGTGCTTTG"  );
  const auto refAln = toNucleotideSequence(  "GCATGAGGAATCTCAGTGCTTTG"  );
  const auto qryAln = toNucleotideSequence(  "-CATG---AATCTCAGT---TTG"  );
  const auto qry =    toNucleotideSequence(   "CATGAATCTCAGTTTG"  );
  // clang-format on

  const std::vector<int> gapOpenCosts = getGapOpenCloseScoresCodonAware(ref, geneMap, options);

  const auto result = alignPairwise(qry, ref, gapOpenCosts, min_length);
  EXPECT_EQ(16*3-5-5, result.alignmentScore);
  EXPECT_EQ(toString(refAln), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, AlignsCodonGapsRef) {
  const NextalignOptions options = {
    .gapOpenInFrame = -5,
    .gapOpenOutOfFrame = -6,
    .genes = {"Gene 1"},
  };

  GeneMap geneMap = {//
    {"Gene 1",       //
      Gene{
        .geneName = "Gene1",
        .start = 1,
        .end = 16,
        .strand = "+",
        .frame = 0,
        .length = 18,
      }}};


  // clang-format off
  const auto qry =    toNucleotideSequence(  "GCATGAGGAATCTCAGTGCTTTG"  );
  const auto qryAln = toNucleotideSequence(  "GCATGAGGAATCTCAGTGCTTTG"  );
  const auto refAln = toNucleotideSequence(  "-CATG---AATCTCAGT---TTG"  );
  const auto ref =    toNucleotideSequence(   "CATGAATCTCAGTTTG"  );
  // clang-format on

  const std::vector<int> gapOpenCosts = getGapOpenCloseScoresCodonAware(ref, geneMap, options);

  const auto result = alignPairwise(qry, ref, gapOpenCosts, min_length);
  EXPECT_EQ(16*3-5-5, result.alignmentScore);
  EXPECT_EQ(toString(refAln), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}


TEST(alignPairwise, AlignsCodonTwoGenes) {
  const NextalignOptions options = {
    .gapOpenInFrame = -5,
    .gapOpenOutOfFrame = -6,
    .genes = {"Gene 1", "Gene 2"},
  };

  GeneMap geneMap = {//
    {"Gene 1",       //
      Gene{
        .geneName = "Gene1",
        .start = 2,
        .end = 11,
        .strand = "+",
        .frame = 0,
        .length = 9,
      }},
    {"Gene 2",       //
      Gene{
        .geneName = "Gene2",
        .start = 13,
        .end = 22,
        .strand = "+",
        .frame = 0,
        .length = 9,
      }}
    };


  // clang-format off
  //                                            111111111..222222222
  const auto ref =    toNucleotideSequence(  "GCATGAGGAATCTCAGTGCTTTGC"  );
  const auto refAln = toNucleotideSequence(  "GCATGAGGAATCTCAG---TGCTTTGC"  );
  const auto qryAln = toNucleotideSequence(  "-CATG---AATCTCAGTAATGCTTTGC"  );
  const auto qry =    toNucleotideSequence(   "CATGAATCTCAGTAATGCTTTGC"  );
  // clang-format on

  const std::vector<int> gapOpenCosts = getGapOpenCloseScoresCodonAware(ref, geneMap, options);

  const auto result = alignPairwise(qry, ref, gapOpenCosts, min_length);
  EXPECT_EQ(20*3-5-5, result.alignmentScore);
  EXPECT_EQ(toString(refAln), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, AlignsCodonGapsQuery2) {
  const NextalignOptions options = {
    .gapOpenInFrame = -5,
    .gapOpenOutOfFrame = -6,
    .genes = {"Gene 1"},
  };

  GeneMap geneMap = {//
    {"Gene 1",       //
      Gene{
        .geneName = "Gene1",
        .start = 0,
        .end = 21,
        .strand = "+",
        .frame = 0,
        .length = 21,
      }}};


  // clang-format off
  const auto ref =    toNucleotideSequence(  "TGGGTGTTTATTACCACAAAA"  );
  const auto refAln = toNucleotideSequence(  "TGGGTGTTTATTACCACAAAA"  );
  const auto qryAln = toNucleotideSequence(  "TGGGTGTTT---ACCACAAAA"  );
  const auto qry =    toNucleotideSequence(  "TGGGTGTTTACCACAAAA"  );
  // clang-format on

  const std::vector<int> gapOpenCosts = getGapOpenCloseScoresCodonAware(ref, geneMap, options);

  const auto result = alignPairwise(qry, ref, gapOpenCosts, min_length);
  EXPECT_EQ(18*3-5, result.alignmentScore);
  EXPECT_EQ(toString(refAln), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}

TEST(alignPairwise, AlignsCodonGapsRef2) {
  const NextalignOptions options = {
    .gapOpenInFrame = -5,
    .gapOpenOutOfFrame = -6,
    .genes = {"Gene 1"},
  };

  GeneMap geneMap = {//
    {"Gene 1",       //
      Gene{
        .geneName = "Gene1",
        .start = 0,
        .end = 18,
        .strand = "+",
        .frame = 0,
        .length = 18,
      }}};


  // clang-format off
  const auto qry =    toNucleotideSequence(  "TGGGTGTTTATTACCACAAAA"  );
  const auto qryAln = toNucleotideSequence(  "TGGGTGTTTATTACCACAAAA"  );
  const auto refAln = toNucleotideSequence(  "TGGGTGTTT---ACCACAAAA"  );
  const auto ref =    toNucleotideSequence(  "TGGGTGTTTACCACAAAA"  );
  // clang-format on

  const std::vector<int> gapOpenCosts = getGapOpenCloseScoresCodonAware(ref, geneMap, options);

  const auto result = alignPairwise(qry, ref, gapOpenCosts, min_length);
  EXPECT_EQ(18*3-5, result.alignmentScore);
  EXPECT_EQ(toString(refAln), toString(result.ref));
  EXPECT_EQ(toString(qryAln), toString(result.query));
}
