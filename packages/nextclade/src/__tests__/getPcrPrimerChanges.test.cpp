#include <gmock/gmock.h>
#include <gtest/gtest.h>

#include <vector>

#include "../../include/nextclade/nextclade.h"
#include "../../include/nextclade/private/nextclade_private.h"
#include "../analyze/getPcrPrimerChanges.h"

#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected))

namespace {
  using ::Nextclade::NucleotideLocation;
  using ::Nextclade::NucleotideSubstitution;
  using ::Nextclade::PcrPrimer;
  using ::Nextclade::Range;
  using ::Nextclade::shouldReportPrimerMutation;

  NucleotideSubstitution makeMutation(int pos, char query) {
    return {
      .pos = pos,
      .queryNuc = toNucleotide(query),
    };
  }

  PcrPrimer makePrimer(const Range& range, const std::vector<std::pair<int, char>>& nonACGTs) {
    std::vector<NucleotideLocation> realNonACGTs;
    realNonACGTs.reserve(nonACGTs.size());
    for (const auto& nonacgt : nonACGTs) {
      realNonACGTs.emplace_back(NucleotideLocation{.pos = nonacgt.first, .nuc = toNucleotide(nonacgt.second)});
    }

    PcrPrimer primer;
    primer.range = range;
    primer.nonAcgts = std::move(realNonACGTs);
    return primer;
  }
}// namespace

TEST(shouldReportPrimerMutation, REPORT_WHEN_PRIMER_HAS_NO_NONACGTS) {
  const auto mut = makeMutation(12, 'A');
  const auto primer = makePrimer({.begin = 10, .end = 15}, {});
  EXPECT_TRUE(shouldReportPrimerMutation(mut, primer));
}

TEST(shouldReportPrimerMutation, REPORT_WHEN_INSIDE_AND_NONACGT_NUCLEOTIDE_DOESNT_MATCH) {
  const auto mut = makeMutation(12, 'A');
  const auto primer = makePrimer({.begin = 10, .end = 15}, {{12, 'S' /* G or C */}});
  EXPECT_TRUE(shouldReportPrimerMutation(mut, primer));
}

TEST(shouldReportPrimerMutation, REPORT_WHEN_INSIDE_AND_NONACGT_POSITION_DOESNT_MATCH) {
  const auto mut = makeMutation(12, 'A');
  const auto primer = makePrimer({.begin = 10, .end = 15}, {{5, 'R' /* A or G */}, {20, 'R' /* A or G */}});
  EXPECT_TRUE(shouldReportPrimerMutation(mut, primer));
}

TEST(shouldReportPrimerMutation, NO_REPORT_WHEN_OUTSIDE_LEFT) {
  const auto mut = makeMutation(8, 'A');
  const auto primer = makePrimer({.begin = 10, .end = 15}, {{12, 'A'}});
  EXPECT_FALSE(shouldReportPrimerMutation(mut, primer));
}

TEST(shouldReportPrimerMutation, NO_REPORT_WHEN_OUTSIDE_RIGHT) {
  const auto mut = makeMutation(19, 'A');
  const auto primer = makePrimer({.begin = 10, .end = 15}, {{12, 'A'}});
  EXPECT_FALSE(shouldReportPrimerMutation(mut, primer));
}

TEST(shouldReportPrimerMutation, NO_REPORT_WHEN_NONACGT_POSITION_AND_NUCLEOTIDE_MATCHES_EXPLICITLY) {
  const auto mut = makeMutation(12, 'A');
  const auto primer = makePrimer({.begin = 10, .end = 15}, {{12, 'A'}});
  EXPECT_FALSE(shouldReportPrimerMutation(mut, primer));
}

TEST(shouldReportPrimerMutation, NO_REPORT_WHEN_NONACGT_POSITION_AND_NUCLEOTIDE_MATCHES_AMBIGUOUSLY) {
  const auto mut = makeMutation(12, 'A');
  const auto primer = makePrimer({.begin = 10, .end = 15}, {{12, 'R' /* A or G */}});
  EXPECT_FALSE(shouldReportPrimerMutation(mut, primer));
}

TEST(shouldReportPrimerMutation, NO_REPORT_WHEN_NONACGT_POSITION_AND_NUCLEOTIDE_MATCHES_FOR_SOME) {
  const auto mut = makeMutation(12, 'A');
  const auto primer = makePrimer({.begin = 10, .end = 15},//
    {
      {4, 'R' /* A or G */},
      {12, 'S' /* G or C */},
      {12, 'R' /* A or G */},
      {19, 'R' /* A or G */},
    });
  EXPECT_FALSE(shouldReportPrimerMutation(mut, primer));
}
