
#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

using namespace Nextclade;// NOLINT(google-build-using-namespace)

#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected))

TEST(operatorLess, Establishes_Correct_Order_Of_Aminoacid_Substitutions) {
  safe_vector<AminoacidSubstitution> elems = {
    AminoacidSubstitution{.gene = "Y", .pos = 2},
    AminoacidSubstitution{.gene = "X", .pos = 3},
    AminoacidSubstitution{.gene = "Z", .pos = 1},
    AminoacidSubstitution{.gene = "X", .pos = 2},
  };

  safe_vector<AminoacidSubstitution> elemsExpected = {
    AminoacidSubstitution{.gene = "X", .pos = 2},
    AminoacidSubstitution{.gene = "X", .pos = 3},
    AminoacidSubstitution{.gene = "Y", .pos = 2},
    AminoacidSubstitution{.gene = "Z", .pos = 1},
  };

  std::sort(elems.begin(), elems.end());

  EXPECT_ARR_EQ(elemsExpected, elems);
}

TEST(operatorLess, Establishes_Correct_Order_Of_Aminoacid_Substitutions_If_Equals) {
  safe_vector<AminoacidSubstitution> elems = {
    AminoacidSubstitution{.gene = "Y", .pos = 2},
    AminoacidSubstitution{.gene = "X", .pos = 2},
    AminoacidSubstitution{.gene = "Y", .pos = 2},
    AminoacidSubstitution{.gene = "X", .pos = 2},
  };

  safe_vector<AminoacidSubstitution> elemsExpected = {
    AminoacidSubstitution{.gene = "X", .pos = 2},
    AminoacidSubstitution{.gene = "X", .pos = 2},
    AminoacidSubstitution{.gene = "Y", .pos = 2},
    AminoacidSubstitution{.gene = "Y", .pos = 2},
  };

  std::sort(elems.begin(), elems.end());

  EXPECT_ARR_EQ(elemsExpected, elems);
}

TEST(operatorLess, Establishes_Correct_Order_Of_Aminoacid_Substitutions_Same_Gene) {
  safe_vector<AminoacidSubstitution> elems = {
    AminoacidSubstitution{.gene = "X", .pos = 2},
    AminoacidSubstitution{.gene = "X", .pos = 3},
    AminoacidSubstitution{.gene = "X", .pos = 1},
    AminoacidSubstitution{.gene = "X", .pos = 4},
  };

  safe_vector<AminoacidSubstitution> elemsExpected = {
    AminoacidSubstitution{.gene = "X", .pos = 1},
    AminoacidSubstitution{.gene = "X", .pos = 2},
    AminoacidSubstitution{.gene = "X", .pos = 3},
    AminoacidSubstitution{.gene = "X", .pos = 4},
  };

  std::sort(elems.begin(), elems.end());

  EXPECT_ARR_EQ(elemsExpected, elems);
}
