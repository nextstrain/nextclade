#include "../analyze/findNucleotideRanges.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade/private/nextclade_private.h>

namespace {
  using Nextclade::findNucleotideRanges;
  using Nextclade::NucleotideRange;
}// namespace

#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected));

TEST(FindNucleotideRanges, Empty_Sequence) {
  const auto actual = findNucleotideRanges(toNucleotideSequence(""), Nucleotide::A);
  const auto expected = std::vector<NucleotideRange>{};
  EXPECT_ARR_EQ(expected, actual)
}

TEST(FindNucleotideRanges, No_Match) {
  const auto actual = findNucleotideRanges(toNucleotideSequence("TCC-GCTN"), Nucleotide::A);
  const auto expected = std::vector<NucleotideRange>{};
  EXPECT_ARR_EQ(expected, actual)
}

TEST(FindNucleotideRanges, Single_Caracter_Begin) {
  const auto actual = findNucleotideRanges(toNucleotideSequence("TGGCNAAGC"), Nucleotide::T);
  const auto expected =
    std::vector<NucleotideRange>{NucleotideRange{.begin = 0, .end = 1, .length = 1, .nuc = Nucleotide::T}};
  EXPECT_ARR_EQ(expected, actual)
}

TEST(FindNucleotideRanges, Single_Caracter_Middle) {
  const auto actual = findNucleotideRanges(toNucleotideSequence("GGCNATAGC"), Nucleotide::T);
  const auto expected =
    std::vector<NucleotideRange>{NucleotideRange{.begin = 5, .end = 6, .length = 1, .nuc = Nucleotide::T}};
  EXPECT_ARR_EQ(expected, actual)
}

TEST(FindNucleotideRanges, Single_Caracter_End) {
  const auto actual = findNucleotideRanges(toNucleotideSequence("GGCNAAGCT"), Nucleotide::T);
  const auto expected =
    std::vector<NucleotideRange>{NucleotideRange{.begin = 8, .end = 9, .length = 1, .nuc = Nucleotide::T}};
  EXPECT_ARR_EQ(expected, actual)
}


TEST(FindNucleotideRanges, One_Range) {
  const auto actual = findNucleotideRanges(toNucleotideSequence("GGNTTTAAGCC"), Nucleotide::T);
  const auto expected =
    std::vector<NucleotideRange>{NucleotideRange{.begin = 3, .end = 6, .length = 3, .nuc = Nucleotide::T}};
  EXPECT_ARR_EQ(expected, actual)
}

TEST(FindNucleotideRanges, Two_Ranges) {
  const auto actual = findNucleotideRanges(toNucleotideSequence("GGNTTTANTTGCC"), Nucleotide::T);
  const auto expected = std::vector<NucleotideRange>{
    NucleotideRange{.begin = 3, .end = 6, .length = 3, .nuc = Nucleotide::T},
    NucleotideRange{.begin = 8, .end = 10, .length = 2, .nuc = Nucleotide::T},
  };
  EXPECT_ARR_EQ(expected, actual)
}

TEST(FindNucleotideRanges, Two_Ranges_One_Char_Apart) {
  const auto actual = findNucleotideRanges(toNucleotideSequence("GGNTTTNTTGCC"), Nucleotide::T);
  const auto expected = std::vector<NucleotideRange>{
    NucleotideRange{.begin = 3, .end = 6, .length = 3, .nuc = Nucleotide::T},
    NucleotideRange{.begin = 7, .end = 9, .length = 2, .nuc = Nucleotide::T},
  };
  EXPECT_ARR_EQ(expected, actual)
}


TEST(FindNucleotideRanges, Two_Ranges_Begin_And_Middle) {
  const auto actual = findNucleotideRanges(toNucleotideSequence("TTGGNTTTANGCC"), Nucleotide::T);
  const auto expected = std::vector<NucleotideRange>{
    NucleotideRange{.begin = 0, .end = 2, .length = 2, .nuc = Nucleotide::T},
    NucleotideRange{.begin = 5, .end = 8, .length = 3, .nuc = Nucleotide::T},
  };
  EXPECT_ARR_EQ(expected, actual)
}

TEST(FindNucleotideRanges, With_Predicate) {
  const auto actual =
    findNucleotideRanges(toNucleotideSequence("TTGGNTTTANGCCTTT"), [](Nucleotide nuc) { return nuc == Nucleotide::T; });
  const auto expected = std::vector<NucleotideRange>{
    NucleotideRange{.begin = 0, .end = 2, .length = 2, .nuc = Nucleotide::T},
    NucleotideRange{.begin = 5, .end = 8, .length = 3, .nuc = Nucleotide::T},
    NucleotideRange{.begin = 13, .end = 16, .length = 3, .nuc = Nucleotide::T},
  };
  EXPECT_ARR_EQ(expected, actual)
}

TEST(FindNucleotideRanges, With_Predicate_Multiple_Nucs) {
  std::set<Nucleotide> GOOD_NUCLEOTIDES = {
    Nucleotide::A, Nucleotide::C, Nucleotide::G, Nucleotide::T, Nucleotide::N, Nucleotide::GAP};

  const auto isNotGoodNuc = [&GOOD_NUCLEOTIDES](Nucleotide nuc) {//
    return GOOD_NUCLEOTIDES.find(nuc) == GOOD_NUCLEOTIDES.end();
  };

  const auto actual = findNucleotideRanges(toNucleotideSequence("TGNYYYTTTUUUUCCTTT"), isNotGoodNuc);

  const auto expected = std::vector<NucleotideRange>{
    NucleotideRange{.begin = 3, .end = 6, .length = 3, .nuc = Nucleotide::Y},
    NucleotideRange{.begin = 9, .end = 13, .length = 4, .nuc = Nucleotide::U},
  };
  EXPECT_ARR_EQ(expected, actual)
}

TEST(FindNucleotideRanges, Consecutive_Ranges) {
  std::set<Nucleotide> GOOD_NUCLEOTIDES = {
    Nucleotide::A, Nucleotide::C, Nucleotide::G, Nucleotide::T, Nucleotide::N, Nucleotide::GAP};

  const auto isNotGoodNuc = [&GOOD_NUCLEOTIDES](Nucleotide nuc) {//
    return GOOD_NUCLEOTIDES.find(nuc) == GOOD_NUCLEOTIDES.end();
  };

  const auto actual = findNucleotideRanges(toNucleotideSequence("TGNYYYUUUUCCTTT"), isNotGoodNuc);

  const auto expected = std::vector<NucleotideRange>{
    NucleotideRange{.begin = 3, .end = 6, .length = 3, .nuc = Nucleotide::Y},
    NucleotideRange{.begin = 6, .end = 10, .length = 4, .nuc = Nucleotide::U},
  };
  EXPECT_ARR_EQ(expected, actual)
}
