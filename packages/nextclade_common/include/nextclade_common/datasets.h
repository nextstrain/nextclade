#pragma once


#include <optional>
#include <ostream>
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

  struct DatasetsIndexJson {
    DatasetsSettings settings;
    std::vector<Dataset> datasets;
  };

  struct DatasetFlat {};

  DatasetsIndexJson fetchDatasetsIndexJson();

  void fetchDatasetVersion(const DatasetVersion& version, const std::string& outDir);

  std::vector<Dataset> getCompatibleDatasets(const std::vector<Dataset>& datasets, const std::string& thisVersion);

  std::vector<Dataset> getLatestDatasets(const std::vector<Dataset>& datasets);

  std::vector<Dataset> getLatestCompatibleDatasets(const std::vector<Dataset>& datasets,
    const std::string& thisVersion);

  std::vector<Dataset> filterDatasetsByName(const std::vector<Dataset>& datasets,
    const std::string& datasetNameDesired);

  std::vector<Dataset> filterDatasetsByVersion(const std::vector<Dataset>& datasets,
    const std::string& datasetVersionDesired);

  std::string formatVersionCompatibility(const DatasetCompatibilityRange& compat);

  std::string formatDatasets(const std::vector<Dataset>& datasets);


  bool operator==(const DatasetCompatibilityRange& left, const DatasetCompatibilityRange& right);

  std::ostream& operator<<(std::ostream& os, const DatasetCompatibilityRange& range);

  bool operator==(const DatasetCompatibility& left, const DatasetCompatibility& right);

  std::ostream& operator<<(std::ostream& os, const DatasetCompatibility& compat);

  bool operator==(const DatasetVersion& left, const DatasetVersion& right);

  std::ostream& operator<<(std::ostream& os, const DatasetVersion& ver);

  bool operator==(const Dataset& left, const Dataset& right);

  std::ostream& operator<<(std::ostream& os, const Dataset& dataset);
}// namespace Nextclade
