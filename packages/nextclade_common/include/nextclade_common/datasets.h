#pragma once


#include <optional>
#include <string>
#include <vector>

namespace Nextclade {

  struct DatasetsSettings {
    std::string defaultDatasetName;
    std::string defaultDatasetNameFriendly;
  };

  struct DatasetFiles {
    std::string geneMap;
    std::string primers;
    std::string qc;
    std::string reference;
    std::string sequences;
    std::string tree;
  };

  struct DatasetCompatibilityRange {
    std::optional<std::string> min;
    std::optional<std::string> max;
  };

  struct DatasetCompatibility {
    DatasetCompatibilityRange nextcladeCli;
    DatasetCompatibilityRange nextcladeWeb;
  };

  struct DatasetVersion {
    std::string datetime;
    std::string comment;
    DatasetCompatibility compatibility;
    DatasetFiles files;
    std::string zipBundle;
  };

  struct Dataset {
    std::string name;
    std::string nameFriendly;
    std::string description;
    std::vector<DatasetVersion> versions;
  };

  struct DatasetsJson {
    DatasetsSettings settings;
    std::vector<Dataset> datasets;
  };

  struct DatasetFlat {};

  DatasetsJson fetchDatasetsJson();

  std::vector<Dataset> getCompatibleDatasets(const std::vector<Dataset>& datasets, const std::string& thisVersion);

  std::vector<Dataset> getLatestDatasets(const std::vector<Dataset>& datasets);

  std::vector<Dataset> getLatestCompatibleDatasets(const std::vector<Dataset>& datasets,
    const std::string& thisVersion);

}// namespace Nextclade
