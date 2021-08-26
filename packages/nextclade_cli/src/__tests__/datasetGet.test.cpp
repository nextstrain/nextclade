#include "../commands/datasetGet.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade_common/datasets.h>

#include <string>
#include <vector>

#include "makeTestDatasets.h"

#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected));

using namespace Nextclade;

const std::string thisVersion = "1.2.1";


TEST(DatasetGetFilter, DefaultsToGettingLatestCompatibleTag) {
  // Is a reference is not specified, only datasets based on the default reference should be considered

  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "A",
    .reference = "",
    .tag = "",
  });

  const std::vector<Dataset> input = makeTestDatasets();

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "A",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "A2"},
            .versions = {DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")}},
          },
        },
    },
  };

  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetGetFilter, DefaultsToGettingLatestCompatibleTagWithReference) {
  // Is a reference is specified, only datasets based on this reference should be considered

  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "A",
    .reference = "A1",
    .tag = "",
  });

  const std::vector<Dataset> input = makeTestDatasets();

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "A",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "A1"},
            .versions = {DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")}},
          },
        },
    },
  };

  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}


TEST(DatasetGetFilter, GetsSpecifiedTag) {
  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "B",
    .reference = "",
    .tag = "2021-03-22T00:00:00Z",
  });

  const std::vector<Dataset> input = makeTestDatasets();

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "B",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B1"},
            .versions = {DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")}},
          },
        },
    },
  };

  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetGetFilter, GetsSpecifiedIncompatibleTag) {
  // NOTE: if a tag is specified, even incompatible tag should be returned

  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "B",
    .reference = "",
    .tag = "2021-04-31T00:00:00Z",
  });

  const std::vector<Dataset> input = makeTestDatasets();

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "B",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B1"},
            .versions =
              {
                DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
              },
          },
        },
    },
  };

  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}
