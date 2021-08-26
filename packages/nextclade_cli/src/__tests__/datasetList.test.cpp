#include "../commands/datasetList.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade_common/datasets.h>

#include <string>
#include <vector>

#include "makeTestDatasets.h"


#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected));

using namespace Nextclade;

const std::string thisVersion = "1.2.1";

TEST(DatasetListFilter, DefaultsToLatestCompatible) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "B",
    .tag = "",
    .includeIncompatible = false,
    .includeOld = false,
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
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B2"},
            .versions = {DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")}},
          },
        },
      .defaultRef = "B2",
    },
  };

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IncludesIncompatible) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "B",
    .tag = "",
    .includeIncompatible = true,
    .includeOld = false,
  });

  const std::vector<Dataset> input = makeTestDatasets();

  const std::vector<Dataset> expected = {
    Dataset{
      .name = "B",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B1"},
            .versions = {DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")}},
          },
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B2"},
            .versions = {DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")}},
          },
        },
      .defaultRef = "B2",
    },
  };

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IncludesOld) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "B",
    .tag = "",
    .includeIncompatible = false,
    .includeOld = true,
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
                DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
                DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
              },
          },
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B2"},
            .versions =
              {
                DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
                DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
              },
          },
        },
      .defaultRef = "B2",
    },
  };

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IncludesOldAndIncompatible) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "B",
    .tag = "",
    .includeIncompatible = true,
    .includeOld = true,
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
                DatasetVersion{.tag = "2021-01-01T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.2.0")},
                DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
                DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
                DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
              },
          },
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B2"},
            .versions =
              {
                DatasetVersion{.tag = "2021-01-01T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.2.0")},
                DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
                DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
                DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
              },
          },
        },
      .defaultRef = "B2",
    },
  };

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IncludesEverything) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "",// Note: name is not provided
    .tag = "",
    .includeIncompatible = true,
    .includeOld = true,
  });

  const std::vector<Dataset> input = makeTestDatasets();

  const std::vector<Dataset>& expected = input;// expected to return the input

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}
