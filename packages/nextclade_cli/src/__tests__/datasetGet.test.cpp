#include "../commands/datasetGet.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade_common/datasets.h>

#include <string>
#include <common/safe_vector.h>

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

  const safe_vector<Dataset> input = makeTestDatasets();

  const safe_vector<Dataset> expected = {
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

  const safe_vector<Dataset> input = makeTestDatasets();

  const safe_vector<Dataset> expected = {
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

  const safe_vector<Dataset> input = makeTestDatasets();

  const safe_vector<Dataset> expected = {
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

  const safe_vector<Dataset> input = makeTestDatasets();

  const safe_vector<Dataset> expected = {
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


TEST(DatasetGetFilter, IgnoresDisabledDatasets) {
  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "B",
    .reference = "",
    .tag = "",
  });

  safe_vector<Dataset> input = makeTestDatasets();

  // Disable the requested dataset
  for (auto& dataset : input) {
    if (dataset.name == cliParams->name) {
      dataset.enabled = false;
    }
  }

  const safe_vector<Dataset> expected = {};

  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}

TEST(DatasetGetFilter, IgnoresDisabledDatasetRef) {
  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "B",
    .reference = "B2",
    .tag = "",
  });

  safe_vector<Dataset> input = makeTestDatasets();

  // Disable the requested dataset ref
  for (auto& dataset : input) {
    if (dataset.name == cliParams->name) {
      for (auto& datasetRef : dataset.datasetRefs) {
        if (datasetRef.reference.accession == cliParams->reference) {
          datasetRef.enabled = false;
        }
      }
    }
  }

  const safe_vector<Dataset> expected = {};

  auto result = datasetGetFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, result)
}


TEST(DatasetGetFilter, GetsSpecifiedDisabledTag) {
  // NOTE: if a tag is specified, even disabled tag should be returned

  const auto cliParams = std::make_shared<CliParamsDatasetGet>(CliParamsDatasetGet{
    .name = "B",
    .reference = "",
    .tag = "2021-04-31T00:00:00Z",
  });

  safe_vector<Dataset> input = makeTestDatasets();

  // Disable everything
  for (auto& dataset : input) {
    dataset.enabled = false;
    for (auto& datasetRef : dataset.datasetRefs) {
      datasetRef.enabled = false;
      for (auto& version : datasetRef.versions) {
        version.enabled = false;
      }
    }
  }

  const safe_vector<Dataset> expected = {
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
