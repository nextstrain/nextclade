#include "../commands/datasetList.h"

#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextclade_common/datasets.h>

#include <string>
#include <common/safe_vector.h>

#include "makeTestDatasets.h"


#define EXPECT_ARR_EQ(expected, actual) ASSERT_THAT(actual, ::testing::ElementsAreArray(expected));

using namespace Nextclade;

const std::string thisVersion = "1.2.1";

TEST(DatasetListFilter, DefaultsToLatestCompatible) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "B",
    .reference = "",
    .tag = "",
    .includeIncompatible = false,
    .includeOld = false,
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
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B2"},
            .versions = {DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")}},
          },
        },
    },
  };

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IncludesIncompatible) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "B",
    .reference = "",
    .tag = "",
    .includeIncompatible = true,
    .includeOld = false,
  });

  const safe_vector<Dataset> input = makeTestDatasets();

  const safe_vector<Dataset> expected = {
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
    },
  };

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IncludesOld) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "B",
    .reference = "",
    .tag = "",
    .includeIncompatible = false,
    .includeOld = true,
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
    },
  };

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IncludesOldAndIncompatible) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "B",
    .reference = "",
    .tag = "",
    .includeIncompatible = true,
    .includeOld = true,
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
    },
  };

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IncludesOnlySpecifiedReference) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "",
    .reference = "B1",
    .tag = "",
    .includeIncompatible = false,
    .includeOld = false,
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

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IncludesNothingIfNameAndRefDontMatch) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "A",
    .reference = "B1",
    .tag = "",
    .includeIncompatible = false,
    .includeOld = false,
  });

  const safe_vector<Dataset> input = makeTestDatasets();

  const safe_vector<Dataset> expected = {};

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IncludesOnlySpecifiedCompatibleTag) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "A",
    .reference = "",
    .tag = "2021-02-11T00:00:00Z",
    .includeIncompatible = false,
    .includeOld = false,
  });

  const safe_vector<Dataset> input = makeTestDatasets();

  const safe_vector<Dataset> expected = {
    Dataset{
      .name = "A",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "A1"},
            .versions = {DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")}},
          },
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "A2"},
            .versions = {DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")}},
          },
        },
    },
  };

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}


TEST(DatasetListFilter, IncludesOnlySpecifiedIncompatibleTag) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "A",
    .reference = "",
    .tag = "2021-04-31T00:00:00Z",
    .includeIncompatible = true,
    .includeOld = true,
  });

  const safe_vector<Dataset> input = makeTestDatasets();

  const safe_vector<Dataset> expected = {
    Dataset{
      .name = "A",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "A1"},
            .versions = {DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")}},
          },
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "A2"},
            .versions = {DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")}},
          },
        },
    },
  };

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}


TEST(DatasetListFilter, IncludesEverything) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "",// Note: name is not provided
    .reference = "",
    .tag = "",
    .includeIncompatible = true,
    .includeOld = true,
  });

  const safe_vector<Dataset> input = makeTestDatasets();

  const safe_vector<Dataset>& expected = input;// expected to return the input

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}

TEST(DatasetListFilter, IgnoresDisabledSpecific) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "",
    .reference = "",
    .tag = "",
    .includeIncompatible = true,
    .includeOld = true,
  });

  safe_vector<Dataset> input = makeTestDatasets();


  for (auto& dataset : input) {

    // Disable dataset "C"
    if (dataset.name == "C") {
      dataset.enabled = false;
    }

    // Disable dataset ref "A1"
    for (auto& datasetRef : dataset.datasetRefs) {
      if (datasetRef.reference.accession == "A1") {
        datasetRef.enabled = false;
      }

      for (auto& version : datasetRef.versions) {

        // Disable tags "2021-01-01T00:00:00Z", "2021-02-11T00:00:00Z" in "B2"
        if (datasetRef.reference.accession == "B2" &&
            (version.tag == "2021-01-01T00:00:00Z" || version.tag == "2021-02-11T00:00:00Z")) {
          version.enabled = false;
        }

        // Disable all tags in "B1"
        if (datasetRef.reference.accession == "B1") {
          version.enabled = false;
        }
      }
    }
  }

  const safe_vector<Dataset> expected = {
    Dataset{
      .name = "A",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "A2"},
            .versions =
              {
                DatasetVersion{.tag = "2021-01-01T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.2.0")},
                DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
                DatasetVersion{.tag = "2021-02-11T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
                DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
              },
          },
        },
    },
    Dataset{
      .name = "B",
      .datasetRefs =
        {
          DatasetRef{
            .reference = DatasetRefSeq{.accession = "B2"},
            .versions =
              {
                DatasetVersion{.tag = "2021-03-22T00:00:00Z", .compatibility = makeCompat("1.0.0", "1.3.0")},
                DatasetVersion{.tag = "2021-04-31T00:00:00Z", .compatibility = makeCompat("1.3.0", "1.4.0")},
              },
          },
        },
    },
  };


  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}


TEST(DatasetListFilter, IgnoresDisabledAll) {
  const auto cliParams = std::make_shared<CliParamsDatasetList>(CliParamsDatasetList{
    .name = "",// Note: name is not provided
    .reference = "",
    .tag = "",
    .includeIncompatible = true,
    .includeOld = true,
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

  const safe_vector<Dataset>& expected = {};

  auto actual = datasetListFilter(input, cliParams, thisVersion);

  EXPECT_ARR_EQ(expected, actual)
}
