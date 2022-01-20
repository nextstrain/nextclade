#include "../analyze/findDeletionRanges.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>


using namespace Nextclade;// NOLINT(google-build-using-namespace)

safe_vector<DeletionSimple<Nucleotide>> makeTestDels(const safe_vector<int>& positions) {
  safe_vector<DeletionSimple<Nucleotide>> dels;
  for (const auto& pos : positions) {
    dels.push_back({.ref = Nucleotide::A, .pos = pos});
  }
  return dels;
}


TEST(FindDeletionRanges, NoRangesWhenNoDelsEmpty) {
  auto actual = findDeletionRanges({/* empty */});
  auto expected = safe_vector<NucleotideRange>{/* empty */};
  EXPECT_EQ(actual, expected);
}

TEST(FindDeletionRanges, FindsSingleDeletions) {
  safe_vector<DeletionSimple<Nucleotide>> dels = makeTestDels({3, /*4,*/ 5, /*6,*/ 7, /*8, 9, 10,*/ 11});
  auto actual = findDeletionRanges(dels);
  auto expected = safe_vector<NucleotideRange>{
    NucleotideRange{.begin = 3, .end = 4, .length = 1, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 5, .end = 6, .length = 1, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 7, .end = 8, .length = 1, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 11, .end = 12, .length = 1, .character = Nucleotide::GAP},
  };
  EXPECT_EQ(actual, expected);
}

TEST(FindDeletionRanges, Finds1Range) {
  safe_vector<DeletionSimple<Nucleotide>> dels = makeTestDels({3, 4, 5, 6, 7});
  auto actual = findDeletionRanges(dels);
  auto expected = safe_vector<NucleotideRange>{
    NucleotideRange{.begin = 3, .end = 8, .length = 5, .character = Nucleotide::GAP},
  };
  EXPECT_EQ(actual, expected);
}

TEST(FindDeletionRanges, Finds2Ranges) {
  safe_vector<DeletionSimple<Nucleotide>> dels = makeTestDels({3, 4, 5, 6, 7, /*8, 9, 10,*/ 11, 12});
  auto actual = findDeletionRanges(dels);
  auto expected = safe_vector<NucleotideRange>{
    NucleotideRange{.begin = 3, .end = 8, .length = 5, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 11, .end = 13, .length = 2, .character = Nucleotide::GAP},
  };
  EXPECT_EQ(actual, expected);
}

TEST(FindDeletionRanges, FindsAlmostAdjacentRanges) {
  safe_vector<DeletionSimple<Nucleotide>> dels = makeTestDels({3, 4, 5, /*6*/ 7, 8, /*9,*/ 10, 11, 12});
  auto actual = findDeletionRanges(dels);
  auto expected = safe_vector<NucleotideRange>{
    NucleotideRange{.begin = 3, .end = 6, .length = 3, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 7, .end = 9, .length = 2, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 10, .end = 13, .length = 3, .character = Nucleotide::GAP},
  };
  EXPECT_EQ(actual, expected);
}

TEST(FindDeletionRanges, GeneralCase) {
  safe_vector<DeletionSimple<Nucleotide>> dels =
    makeTestDels({3, /*4,*/ 5, /*6*/ 7, 8, 9, 10, /*11,*/ 12, 13, /*14,*/ 15});
  auto actual = findDeletionRanges(dels);
  auto expected = safe_vector<NucleotideRange>{
    NucleotideRange{.begin = 3, .end = 4, .length = 1, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 5, .end = 6, .length = 1, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 7, .end = 11, .length = 4, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 12, .end = 14, .length = 2, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 15, .end = 16, .length = 1, .character = Nucleotide::GAP},
  };
  EXPECT_EQ(actual, expected);
}

TEST(FindDeletionRanges, GeneralCaseNotSorted) {
  safe_vector<DeletionSimple<Nucleotide>> dels = makeTestDels({5, 3, 9, 13, 12, 8, 7, 15, 10});
  auto actual = findDeletionRanges(dels);
  auto expected = safe_vector<NucleotideRange>{
    NucleotideRange{.begin = 3, .end = 4, .length = 1, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 5, .end = 6, .length = 1, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 7, .end = 11, .length = 4, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 12, .end = 14, .length = 2, .character = Nucleotide::GAP},
    NucleotideRange{.begin = 15, .end = 16, .length = 1, .character = Nucleotide::GAP},
  };
  EXPECT_EQ(actual, expected);
}
