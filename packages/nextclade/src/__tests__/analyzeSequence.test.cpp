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

  const auto query = toNucleotideSequence("NNNAAANNN");
  const auto ref = toNucleotideSequence("AAAA");

  const auto results = analyze(query, ref);

  EXPECT_EQ(4, results.alignmentStart);
  EXPECT_EQ(8, results.alignmentEnd);
}

TEST(analyzes, ReportsInsertions) {
  std::stringstream input;

  const auto query = toNucleotideSequence("AACAA");
  const auto ref = toNucleotideSequence("AAAA");

  const auto results = analyze(query, ref);

  const auto ins = toNucleotideSequence("C");
  const auto expected = std::vector<NucleotideInsertion>({{.pos = 2, .length = 1, .ins = ins}});

  EXPECT_ARR_EQ(expected, results.insertions)
}

TEST(analyzes, ReportsSubstitutions) {
  std::stringstream input;

  const auto query = toNucleotideSequence("ACAA");
  const auto ref = toNucleotideSequence("AAAA");

  const auto results = analyze(query, ref);

  const auto expected =
    std::vector<NucleotideSubstitution>({{.pos = 1, .refNuc = Nucleotide::A, .queryNuc = Nucleotide::C}});

  EXPECT_ARR_EQ(expected, results.substitutions)
}

TEST(analyzes, ReportsDeletions) {
  std::stringstream input;

  const auto query = toNucleotideSequence("CTG");
  const auto ref = toNucleotideSequence("CTAG");

  const auto results = analyze(query, ref);

  const auto expected = std::vector<NucleotideDeletion>({{.start = 1, .length = 1}});

  EXPECT_ARR_EQ(expected, results.deletions)
}
