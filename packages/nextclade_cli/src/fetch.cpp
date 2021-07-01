#include "fetch.h"

#include <nextclade/nextclade.h>

#include <nlohmann/json.hpp>
#include <semver.hpp>
#include <string>

// TODO: don't include private files from another package. Extract this to a separate package.
#include "../../nextclade/src/io/jsonParse.h"


namespace {
  using json = nlohmann::ordered_json;

  inline std::string fetch(const std::string& url) {
    auto response = cpr::Get(cpr::Url{url});
    return response.text;
  }

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

  bool isDatasetVersionCompatible(const DatasetVersion& version) {
    const auto& thisVersionStr = Nextclade::getVersion();
    const auto thisVersion = semver::from_string(thisVersionStr);
    const auto min = semver::from_string(version.compatibility.nextcladeCli.min.value_or(thisVersionStr));
    const auto max = semver::from_string(version.compatibility.nextcladeCli.max.value_or(thisVersionStr));
    return (thisVersion > min && thisVersion < max);
  }

}//namespace


DatasetsJson fetchDatasetsJson() {
  const auto& datasetsJsonStr = fetch("http://localhost:27722/_generated/datasets.json");
  return parseDatasetsJson(datasetsJsonStr);
}

std::vector<Dataset> getCompatibleDatasets(const std::vector<Dataset>& datasets) {
  std::vector<Dataset> datasetsCompatible;
  for (const auto& dataset : datasets) {

    // Find compatible versions
    std::vector<DatasetVersion> versionsCompatible;
    for (const auto& version : dataset.versions) {
      if (isDatasetVersionCompatible(version)) {
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

std::vector<Dataset> getLatestCompatibleDatasets(const std::vector<Dataset>& datasets) {
  return getLatestDatasets(getCompatibleDatasets(datasets));
}
