#include <gtest/gtest.h>

#include <vector>

#include "../analyze/getNucleotideComposition.h"

using Nextclade::getNucleotideComposition;

TEST(getNucleotideComposition, Empty) {
  const auto seq = toNucleotideSequence("");
  auto nucleotideComposition = getNucleotideComposition(seq);
  EXPECT_EQ(0, nucleotideComposition.size());
}

TEST(getNucleotideComposition, SameCharacter) {
  const auto seq = toNucleotideSequence("GGGGG");
  auto nucleotideComposition = getNucleotideComposition(seq);

  EXPECT_EQ(1, nucleotideComposition.size());

  EXPECT_EQ(5, nucleotideComposition[Nucleotide::G]);
}

TEST(getNucleotideComposition, GeneralCase) {
  const auto seq = toNucleotideSequence("ACTTTCUGATCTC-TTGTAG---ATCTGTTCTCTYUAAACGAACTTTA");
  auto nucleotideComposition = getNucleotideComposition(seq);

  EXPECT_EQ(7, nucleotideComposition.size());

  EXPECT_EQ(10, nucleotideComposition[Nucleotide::A]);
  EXPECT_EQ(9, nucleotideComposition[Nucleotide::C]);
  EXPECT_EQ(5, nucleotideComposition[Nucleotide::G]);
  EXPECT_EQ(17, nucleotideComposition[Nucleotide::T]);
  EXPECT_EQ(4, nucleotideComposition[Nucleotide::GAP]);
  EXPECT_EQ(2, nucleotideComposition[Nucleotide::U]);
  EXPECT_EQ(1, nucleotideComposition[Nucleotide::Y]);
}
