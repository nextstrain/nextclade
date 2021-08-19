#include "../commands/datasetList.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade_common/datasets.h>

#include <string>
#include <vector>


#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected));

using namespace Nextclade;// NOLINT(google-build-using-namespace)


namespace {
  DatasetCompatibility makeCompat(const std::string& min, const std::string& max) {
    return {
      .nextcladeCli = DatasetCompatibilityRange{.min = min, .max = max},
    };
  }
}// namespace

const std::string thisVersion = "1.2.1";

const auto one = Dataset{
  .name = "dataset-number-one",
  .versions =
    {
      DatasetVersion{.tag = "2021-01-01T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.2.0")},
      DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
    },
};

const auto two = Dataset{
  .name = "dataset-number-two",
  .versions =
    {
      DatasetVersion{.tag = "2021-01-01T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.2.0")},
      DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
    },
};

const auto three = Dataset{
  .name = "dataset-number-three",
  .versions =
    {
      DatasetVersion{.tag = "2021-01-01T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.2.0")},
      DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
    },
};


TEST(DatasetListFilter, DefaultsToLatestCompatible) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "dataset-number-two",
    .tag = "",
    .includeIncompatible = false,
    .includeOld = false,
  });

  const std::vector<Dataset> input = {one, two, three};

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "dataset-number-two",
      .versions =
        {
          DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
        },
    },
  };


  auto result = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetListFilter, IncludesIncompatible) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "dataset-number-two",
    .tag = "",
    .includeIncompatible = true,
    .includeOld = false,
  });

  const std::vector<Dataset> input = {one, two, three};

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "dataset-number-two",
      .versions =
        {
          DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
        },
    },
  };


  auto result = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetListFilter, IncludesOld) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "dataset-number-two",
    .tag = "",
    .includeIncompatible = false,
    .includeOld = true,
  });

  const std::vector<Dataset> input = {one, two, three};

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "dataset-number-two",
      .versions =
        {
          DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
          DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
        },
    },
  };


  auto result = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetListFilter, IncludesOldAndIncompatible) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "dataset-number-two",
    .tag = "",
    .includeIncompatible = true,
    .includeOld = true,
  });

  const std::vector<Dataset> input = {one, two, three};

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "dataset-number-two",
      .versions =
        {
          DatasetVersion{.tag = "2021-01-01T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.2.0")},
          DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
          DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
          DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
        },
    },
  };

  auto result = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetListFilter, IncludesEverything) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "",// Note: name is not provided
    .tag = "",
    .includeIncompatible = true,
    .includeOld = true,
  });

  const std::vector<Dataset> input = {one, two, three};

  const std::vector<Dataset> expected = {one, two, three};

  auto result = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}
