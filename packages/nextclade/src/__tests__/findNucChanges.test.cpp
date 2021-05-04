#include "../analyze/findNucChanges.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include <string>
#include <vector>

#include "../../include/nextclade/nextclade.h"
#include "../../include/nextclade/private/nextclade_private.h"

#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected));

using Nextclade::findNucChanges;
using Nextclade::NucleotideDeletion;
using Nextclade::NucleotideInsertion;
using Nextclade::NucleotideSubstitution;

TEST(FindNucChanges, ReportsAlignmentStartAndEnd) {
  std::stringstream input;

  // clang-format off
  const auto ref   = toNucleotideSequence(      "AAA"      );
  const auto query = toNucleotideSequence("---" "AAA" "---");
  // clang-format on                       012   345   678

  const auto results = findNucChanges(ref, query);

  EXPECT_EQ(3, results.alignmentStart);
  EXPECT_EQ(6, results.alignmentEnd);
}

TEST(FindNucChanges, ReportsSubstitutions) {
  std::stringstream input;

  // clang-format off
  const auto ref   = toNucleotideSequence("CTA" "ATA" "GTA");
  const auto query = toNucleotideSequence("ATA" "TTA" "GTA");
  // clang-format on                       012   345   678

  const auto results = findNucChanges(ref, query);

  const auto expected = std::vector<NucleotideSubstitution>({
    {.refNuc = Nucleotide::C, .pos = 0, .queryNuc = Nucleotide::A},
    {.refNuc = Nucleotide::A, .pos = 3, .queryNuc = Nucleotide::T},
  });

  EXPECT_ARR_EQ(expected, results.substitutions)
}

TEST(FindNucChanges, ReportsDeletions) {
  std::stringstream input;

  // clang-format off
  const auto ref   = toNucleotideSequence("CTA" "ATA" "GTA");
  const auto query = toNucleotideSequence("CTA" "---" "GTA");
  // clang-format on                       012   345   678

  const auto results = findNucChanges(ref, query);

  const auto expected = std::vector<NucleotideDeletion>({
    {.start = 3, .length = 3}
  });

  EXPECT_ARR_EQ(expected, results.deletions)
}
