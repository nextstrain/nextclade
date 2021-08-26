#include "../commands/datasetGet.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade_common/datasets.h>

#include <string>
#include <vector>

#include "makeTestDatasets.h"

#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected));

using namespace Nextclade;// NOLINT(google-build-using-namespace)

const std::string thisVersion = "1.2.1";


TEST(DatasetGetFilter, DefaultsToGettingLatestCompatibleTag) {
  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "B",
    .tag = "",
  });

  const std::vector<Dataset> input = makeTestDatasets();

  const std::vector<Dataset> expected = {
    Dataset{
      .enabled = true,
      .name = "B",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B1"},
            .versions =
              {
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-03-22T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
              },
          },
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B2"},
            .versions =
              {
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-03-22T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
              },
          },
        },
      .defaultRef = "B2",
    },
  };

  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetGetFilter, GetsSpecifiedTag) {
  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "B",
    .tag = "2021-03-22T00:00:00Z",
  });

  const std::vector<Dataset> input = makeTestDatasets();

  const std::vector<Dataset> expected = {
    Dataset{
      .enabled = true,
      .name = "B",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B1"},
            .versions = {DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")}},
          },
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B2"},
            .versions = {DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")}},
          },
        },
      .defaultRef = "B2",
    },
  };

  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetGetFilter, GetsSpecifiedIncompatibleTag) {
  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "B",
    .tag = "2021-04-31T00:00:00Z",
  });

  const std::vector<Dataset> input = makeTestDatasets();

  const std::vector<Dataset> expected = {
    Dataset{
      .enabled = true,
      .name = "B",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B1"},
            .versions =
              {
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-04-31T00:00:00Z",
                  .compatibility = makeCompat("1.3.0", "1.4.0"),
                },
              },
          },
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B2"},
            .versions =
              {
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-04-31T00:00:00Z",
                  .compatibility = makeCompat("1.3.0", "1.4.0"),
                },
              },
          },
        },
      .defaultRef = "B2",
    },
  };

  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}
