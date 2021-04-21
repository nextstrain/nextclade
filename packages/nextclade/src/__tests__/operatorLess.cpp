
#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

using namespace Nextclade;// NOLINT(google-build-using-namespace)

#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected))

TEST(operatorLess, Establishes_Correct_Order_Of_Aminoacid_Substitutions) {
  std::vector<AminoacidSubstitution> elems = {
    AminoacidSubstitution{.gene = "Y", .codon = 2},
    AminoacidSubstitution{.gene = "X", .codon = 3},
    AminoacidSubstitution{.gene = "Z", .codon = 1},
    AminoacidSubstitution{.gene = "X", .codon = 2},
  };

  std::vector<AminoacidSubstitution> elemsExpected = {
    AminoacidSubstitution{.gene = "X", .codon = 2},
    AminoacidSubstitution{.gene = "X", .codon = 3},
    AminoacidSubstitution{.gene = "Y", .codon = 2},
    AminoacidSubstitution{.gene = "Z", .codon = 1},
  };

  std::sort(elems.begin(), elems.end());

  EXPECT_ARR_EQ(elemsExpected, elems);
}

TEST(operatorLess, Establishes_Correct_Order_Of_Aminoacid_Substitutions_If_Equals) {
  std::vector<AminoacidSubstitution> elems = {
    AminoacidSubstitution{.gene = "Y", .codon = 2},
    AminoacidSubstitution{.gene = "X", .codon = 2},
    AminoacidSubstitution{.gene = "Y", .codon = 2},
    AminoacidSubstitution{.gene = "X", .codon = 2},
  };

  std::vector<AminoacidSubstitution> elemsExpected = {
    AminoacidSubstitution{.gene = "X", .codon = 2},
    AminoacidSubstitution{.gene = "X", .codon = 2},
    AminoacidSubstitution{.gene = "Y", .codon = 2},
    AminoacidSubstitution{.gene = "Y", .codon = 2},
  };

  std::sort(elems.begin(), elems.end());

  EXPECT_ARR_EQ(elemsExpected, elems);
}

TEST(operatorLess, Establishes_Correct_Order_Of_Aminoacid_Substitutions_Same_Gene) {
  std::vector<AminoacidSubstitution> elems = {
    AminoacidSubstitution{.gene = "X", .codon = 2},
    AminoacidSubstitution{.gene = "X", .codon = 3},
    AminoacidSubstitution{.gene = "X", .codon = 1},
    AminoacidSubstitution{.gene = "X", .codon = 4},
  };

  std::vector<AminoacidSubstitution> elemsExpected = {
    AminoacidSubstitution{.gene = "X", .codon = 1},
    AminoacidSubstitution{.gene = "X", .codon = 2},
    AminoacidSubstitution{.gene = "X", .codon = 3},
    AminoacidSubstitution{.gene = "X", .codon = 4},
  };

  std::sort(elems.begin(), elems.end());

  EXPECT_ARR_EQ(elemsExpected, elems);
}
