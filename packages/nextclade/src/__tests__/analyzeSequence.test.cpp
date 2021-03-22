#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include <string>
#include <vector>

#include "../../include/nextclade/nextclade.h"
#include "../../include/nextclade/private/nextclade_private.h"
#include "../analyze/analyze.h"

#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected));

using Nextclade::analyze;
using Nextclade::NucleotideDeletion;
using Nextclade::NucleotideInsertion;
using Nextclade::NucleotideSubstitution;

TEST(analyzes, ReportsAlignmentStartAndEnd) {
  std::stringstream input;

  // clang-format off
  const auto ref   = toNucleotideSequence(      "AAA"      );
  const auto query = toNucleotideSequence("---" "AAA" "---");
  // clang-format on                       012   345   678

  const auto results = analyze(query, ref);

  EXPECT_EQ(3, results.alignmentStart);
  EXPECT_EQ(6, results.alignmentEnd);
}

TEST(analyzes, ReportsSubstitutions) {
  std::stringstream input;

  // clang-format off
  const auto ref   = toNucleotideSequence("CTA" "ATA" "GTA");
  const auto query = toNucleotideSequence("ATA" "TTA" "GTA");
  // clang-format on                       012   345   678

  const auto results = analyze(query, ref);

  const auto expected = std::vector<NucleotideSubstitution>({
    {.refNuc = Nucleotide::C, .pos = 0, .queryNuc = Nucleotide::A},
    {.refNuc = Nucleotide::A, .pos = 3, .queryNuc = Nucleotide::T},
  });

  EXPECT_ARR_EQ(expected, results.substitutions)
}

TEST(analyzes, ReportsInsertions) {
  std::stringstream input;

  // clang-format off
  const auto ref   = toNucleotideSequence("CTA" "---" "GTA");
  const auto query = toNucleotideSequence("CTA" "ATA" "GTA");
  // clang-format on                       012   345   678

  const auto results = analyze(query, ref);

  const auto expected = std::vector<NucleotideInsertion>({
    {.pos = 3, .length = 3, .ins = toNucleotideSequence("ATA")},
  });

  EXPECT_ARR_EQ(expected, results.insertions)
}


TEST(analyzes, ReportsDeletions) {
  std::stringstream input;

  // clang-format off
  const auto ref   = toNucleotideSequence("CTA" "ATA" "GTA");
  const auto query = toNucleotideSequence("CTA" "---" "GTA");
  // clang-format on                       012   345   678

  const auto results = analyze(query, ref);

  const auto expected = std::vector<NucleotideDeletion>({
    {.start = 3, .length = 3}
  });

  EXPECT_ARR_EQ(expected, results.deletions)
}
