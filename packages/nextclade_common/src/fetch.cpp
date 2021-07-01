#include <cpr/cpr.h>
#include <nextclade_common/fetch.h>
#include <nextclade_json/nextclade_json.h>

#include <nlohmann/json.hpp>
#include <semver.hpp>
#include <string>

namespace Nextclade {

  namespace {
    using json = nlohmann::ordered_json;

    DatasetsSettings parseDatasetSettings(const json& j) {
      return DatasetsSettings{
        .defaultDatasetName = at(j, "defaultDatasetName"),
        .defaultDatasetNameFriendly = at(j, "defaultDatasetNameFriendly"),
      };
    }

    DatasetCompatibilityRange parseCompatibilityRange(const json& j) {
      return DatasetCompatibilityRange{
        .min = parseOptionalString(j, "min"),
        .max = parseOptionalString(j, "max"),
      };
    }

    DatasetCompatibility parseDatasetCompatibility(const json& j) {
      return DatasetCompatibility{
        .nextcladeCli = parseCompatibilityRange(at(j, "nextcladeCli")),
        .nextcladeWeb = parseCompatibilityRange(at(j, "nextcladeWeb")),
      };
    }

    DatasetFiles parseDatasetFiles(const json& j) {
      return DatasetFiles{
        .geneMap = at(j, "geneMap"),
        .primers = at(j, "primers"),
        .qc = at(j, "qc"),
        .reference = at(j, "reference"),
        .sequences = at(j, "sequences"),
        .tree = at(j, "tree"),
      };
    }

    DatasetVersion parseVersion(const json& j) {
      return DatasetVersion{
        .datetime = at(j, "datetime"),
        .comment = at(j, "comment"),
        .compatibility = parseDatasetCompatibility(at(j, "compatibility")),
        .files = parseDatasetFiles(at(j, "files")),
      };
    }

    Dataset parseDataset(const json& j) {
      return Dataset{
        .name = at(j, "name"),
        .nameFriendly = at(j, "nameFriendly"),
        .description = at(j, "description"),
        .versions = parseArray<DatasetVersion>(j, "versions", parseVersion),
      };
    }

    DatasetsJson parseDatasetsJson(const std::string& datasetsJsonStr) {
      const auto j = json::parse(datasetsJsonStr);

      return DatasetsJson{
        .settings = parseDatasetSettings(at(j, "settings")),
        .datasets = parseArray<Dataset>(j, "datasets", parseDataset),
      };
    }

    bool isDatasetVersionCompatible(const DatasetVersion& version, const std::string& thisVersionStr) {
      const auto thisVersion = semver::from_string(thisVersionStr);
      const auto min = semver::from_string(version.compatibility.nextcladeCli.min.value_or(thisVersionStr));
      const auto max = semver::from_string(version.compatibility.nextcladeCli.max.value_or(thisVersionStr));
      return (thisVersion > min && thisVersion < max);
    }

  }//namespace


  std::string fetch(const std::string& url) {
    //    cpr::SslOptions sslOpts = cpr::Ssl(cpr::ssl::TLSv1_3{});
    auto response = cpr::Get(cpr::Url{url});

    fmt::print("response.error.code:    {:d}\n", response.error.code);
    fmt::print("response.error.message: {:s}\n", response.error.message);
    fmt::print("response.reason:        {:s}\n", response.reason);
    fmt::print("response.status_code:   {:d}\n", response.status_code);
    fmt::print("response.status_line:   {:s}\n", response.status_line);
    //  fmt::format("response.text:          {:s}\n", response.text.c_str());
    //  fflush(stdout);


    return response.text;
  }


  DatasetsJson fetchDatasetsJson() {
    const std::string url = "https://d2y3t6seg8c135.cloudfront.net/_generated/datasets.json";
    //  const std::string url = "http://localhost:27722/_generated/datasets.json";
    const auto& datasetsJsonStr = fetch(url);
    std::exit(0);
    return parseDatasetsJson(datasetsJsonStr);
  }

  std::vector<Dataset> getCompatibleDatasets(const std::vector<Dataset>& datasets, const std::string& thisVersion) {
    std::vector<Dataset> datasetsCompatible;
    for (const auto& dataset : datasets) {

      // Find compatible versions
      std::vector<DatasetVersion> versionsCompatible;
      for (const auto& version : dataset.versions) {
        if (isDatasetVersionCompatible(version, thisVersion)) {
          versionsCompatible.push_back(version);
        }
      }

      auto datasetCompatible = Dataset{dataset};
      datasetCompatible.versions = {std::move(versionsCompatible)};

      // Dataset is compatible if there is at least one compatible version
      if (!datasetCompatible.versions.empty()) {
        datasetsCompatible.push_back(datasetCompatible);
      }
    }

    return datasetsCompatible;
  }

  std::vector<Dataset> getLatestDatasets(const std::vector<Dataset>& datasets) {
    std::vector<Dataset> datasetsLatest;
    for (const auto& dataset : datasets) {
      if (dataset.versions.empty()) {
        continue;
      }

      // Find latest version
      auto latestVersion = dataset.versions[0];
      for (const auto& version : dataset.versions) {
        if (version.datetime > latestVersion.datetime) {
          latestVersion = version;
        }
      }

      auto datasetLatest = Dataset{dataset};
      datasetLatest.versions = {std::move(latestVersion)};

      // Dataset is compatible if there is at least one compatible version
      if (!dataset.versions.empty()) {
        datasetsLatest.push_back(datasetLatest);
      }
    }

    return datasetsLatest;
  }

  std::vector<Dataset> getLatestCompatibleDatasets(const std::vector<Dataset>& datasets,
    const std::string& thisVersion) {
    return getLatestDatasets(getCompatibleDatasets(datasets, thisVersion));
  }

}// namespace Nextclade
