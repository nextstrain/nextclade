#include "../commands/datasetGet.h"

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
      DatasetVersion{.datetime = "2021-01-01T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.2.0")},
      DatasetVersion{.datetime = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.datetime = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.datetime = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
    },
};

const auto two = Dataset{
  .name = "dataset-number-two",
  .versions =
    {
      DatasetVersion{.datetime = "2021-01-01T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.2.0")},
      DatasetVersion{.datetime = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.datetime = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.datetime = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
    },
};

const auto three = Dataset{
  .name = "dataset-number-three",
  .versions =
    {
      DatasetVersion{.datetime = "2021-01-01T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.2.0")},
      DatasetVersion{.datetime = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.datetime = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
      DatasetVersion{.datetime = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
    },
};


TEST(DatasetGetFilter, DefaultsToGettingLatestCompatibleTag) {
  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "dataset-number-two",
    .tag = "",
  });

  const std::vector<Dataset> input = {one, two, three};

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "dataset-number-two",
      .versions =
        {
          DatasetVersion{.datetime = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
        },
    },
  };


  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetGetFilter, GetsSpecifiedTag) {
  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "dataset-number-two",
    .tag = "2021-03-22T00:00:00Z",
  });

  const std::vector<Dataset> input = {one, two, three};

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "dataset-number-two",
      .versions =
        {
          DatasetVersion{.datetime = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
        },
    },
  };


  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetGetFilter, GetsSpecifiedIncompatibleTag) {
  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "dataset-number-two",
    .tag = "2021-04-31T00:00:00Z",
  });

  const std::vector<Dataset> input = {one, two, three};

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "dataset-number-two",
      .versions =
        {
          DatasetVersion{.datetime = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
        },
    },
  };


  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}
