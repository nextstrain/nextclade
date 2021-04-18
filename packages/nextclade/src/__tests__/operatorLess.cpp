
#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

using namespace Nextclade;// NOLINT(google-build-using-namespace)

#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected))

TEST(operatorLess, Establishes_Correct_Order_Of_Aminoacid_Substitutions) {
  std::vector<AminoacidSubstitution> elems = {
    AminoacidSubstitution{.codon = 2, .gene = "Y"},
    AminoacidSubstitution{.codon = 3, .gene = "X"},
    AminoacidSubstitution{.codon = 1, .gene = "Z"},
    AminoacidSubstitution{.codon = 2, .gene = "X"},
  };

  std::vector<AminoacidSubstitution> elemsExpected = {
    AminoacidSubstitution{.codon = 2, .gene = "X"},
    AminoacidSubstitution{.codon = 3, .gene = "X"},
    AminoacidSubstitution{.codon = 2, .gene = "Y"},
    AminoacidSubstitution{.codon = 1, .gene = "Z"},
  };

  std::sort(elems.begin(), elems.end());

  EXPECT_ARR_EQ(elemsExpected, elems);
}

TEST(operatorLess, Establishes_Correct_Order_Of_Aminoacid_Substitutions_If_Equals) {
  std::vector<AminoacidSubstitution> elems = {
    AminoacidSubstitution{.codon = 2, .gene = "Y"},
    AminoacidSubstitution{.codon = 2, .gene = "X"},
    AminoacidSubstitution{.codon = 2, .gene = "Y"},
    AminoacidSubstitution{.codon = 2, .gene = "X"},
  };

  std::vector<AminoacidSubstitution> elemsExpected = {
    AminoacidSubstitution{.codon = 2, .gene = "X"},
    AminoacidSubstitution{.codon = 2, .gene = "X"},
    AminoacidSubstitution{.codon = 2, .gene = "Y"},
    AminoacidSubstitution{.codon = 2, .gene = "Y"},
  };

  std::sort(elems.begin(), elems.end());

  EXPECT_ARR_EQ(elemsExpected, elems);
}

TEST(operatorLess, Establishes_Correct_Order_Of_Aminoacid_Substitutions_Same_Gene) {
  std::vector<AminoacidSubstitution> elems = {
    AminoacidSubstitution{.codon = 2, .gene = "X"},
    AminoacidSubstitution{.codon = 3, .gene = "X"},
    AminoacidSubstitution{.codon = 1, .gene = "X"},
    AminoacidSubstitution{.codon = 4, .gene = "X"},
  };

  std::vector<AminoacidSubstitution> elemsExpected = {
    AminoacidSubstitution{.codon = 1, .gene = "X"},
    AminoacidSubstitution{.codon = 2, .gene = "X"},
    AminoacidSubstitution{.codon = 3, .gene = "X"},
    AminoacidSubstitution{.codon = 4, .gene = "X"},
  };

  std::sort(elems.begin(), elems.end());

  EXPECT_ARR_EQ(elemsExpected, elems);
}
