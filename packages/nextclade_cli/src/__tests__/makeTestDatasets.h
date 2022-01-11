#pragma once
#include <nextclade_common/datasets.h>

#include <string>
#include <common/safe_vector.h>

namespace Nextclade {
  inline DatasetCompatibility makeCompat(const std::string& min, const std::string& max) {
    return {
      .nextcladeCli = DatasetCompatibilityRange{.min = min, .max = max},
    };
  }

  inline safe_vector<Dataset> makeTestDatasets() {
    auto one = Dataset{
      .enabled = true,
      .name = "A",
      .datasetRefs =
        {
          DatasetRef{
            .enabled = true,
            .reference = DatasetRefSeq{.accession = "A1"},
            .versions =
              {
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-01-01T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.2.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-03-22T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-02-11T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-04-31T00:00:00Z",
                  .compatibility = makeCompat("1.3.0", "1.4.0"),
                },
              },
          },
          DatasetRef{
            .enabled = true,
            .reference = DatasetRefSeq{.accession = "A2"},
            .versions =
              {
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-01-01T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.2.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-03-22T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-02-11T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-04-31T00:00:00Z",
                  .compatibility = makeCompat("1.3.0", "1.4.0"),
                },
              },
          },
        },
      .defaultRef = "A2",
    };

    auto two = Dataset{
      .enabled = true,
      .name = "B",
      .datasetRefs =
        {
          DatasetRef{
            .enabled = true,
            .reference = DatasetRefSeq{.accession = "B1"},
            .versions =
              {
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-01-01T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.2.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-03-22T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-02-11T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-04-31T00:00:00Z",
                  .compatibility = makeCompat("1.3.0", "1.4.0"),
                },
              },
          },
          DatasetRef{
            .enabled = true,
            .reference = DatasetRefSeq{.accession = "B2"},
            .versions =
              {
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-01-01T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.2.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-03-22T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-02-11T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-04-31T00:00:00Z",
                  .compatibility = makeCompat("1.3.0", "1.4.0"),
                },
              },
          },
        },
      .defaultRef = "B1",
    };


    auto three = Dataset{
      .enabled = true,
      .name = "C",
      .datasetRefs =
        {
          DatasetRef{
            .enabled = true,
            .reference = DatasetRefSeq{.accession = "C1"},
            .versions =
              {
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-01-01T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.2.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-03-22T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-02-11T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-04-31T00:00:00Z",
                  .compatibility = makeCompat("1.3.0", "1.4.0"),
                },
              },
          },
          DatasetRef{
            .enabled = true,
            .reference = DatasetRefSeq{.accession = "C2"},
            .versions =
              {
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-01-01T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.2.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-03-22T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-02-11T00:00:00Z",
                  .compatibility = makeCompat("1.0.0", "1.3.0"),
                },
                DatasetVersion{
                  .enabled = true,
                  .tag = "2021-04-31T00:00:00Z",
                  .compatibility = makeCompat("1.3.0", "1.4.0"),
                },
              },
          },
        },
      .defaultRef = "C1",
    };

    return safe_vector<Dataset>{one, two, three};
  }
}// namespace Nextclade
