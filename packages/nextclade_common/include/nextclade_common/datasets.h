#pragma once


#include <map>
#include <optional>
#include <ostream>
#include <string>
#include <vector>

namespace Nextclade {

  struct DatasetsSettings {
    std::string defaultDatasetName;
    std::string defaultDatasetNameFriendly;
  };

  using DatasetFiles = std::map<std::string, std::string>;

  struct DatasetCompatibilityRange {
    std::optional<std::string> min;
    std::optional<std::string> max;
  };

  struct DatasetCompatibility {
    DatasetCompatibilityRange nextcladeCli;
    DatasetCompatibilityRange nextcladeWeb;
  };

  struct DatasetVersion {
    bool enabled;
    std::string tag;
    std::string comment;
    DatasetCompatibility compatibility;
    DatasetFiles files;
    std::string zipBundle;
  };

  struct DatasetRefSeq {
    std::string accession;
    std::string source;
    std::string strainName;
  };

  struct DatasetRef {
    bool enabled;
    DatasetRefSeq reference;
    std::vector<DatasetVersion> versions;
  };

  struct Dataset {
    bool enabled;
    std::string name;
    std::string nameFriendly;
    std::vector<DatasetRef> datasetRefs;
    std::string defaultRef;
  };

  struct DatasetsIndexJson {
    DatasetsSettings settings;
    std::vector<Dataset> datasets;
  };

  DatasetsIndexJson fetchDatasetsIndexJson();

  void fetchDatasetVersion(const DatasetVersion& version, const std::string& outDir);

  std::vector<Dataset> getEnabledDatasets(const std::vector<Dataset>& datasets);

  std::vector<Dataset> getCompatibleDatasets(const std::vector<Dataset>& datasets, const std::string& thisVersion);

  std::vector<Dataset> getLatestDatasets(const std::vector<Dataset>& datasets);

  std::vector<Dataset> getLatestCompatibleDatasets(const std::vector<Dataset>& datasets,
    const std::string& thisVersion);

  std::vector<Dataset> filterDatasetsByName(const std::vector<Dataset>& datasets,
    const std::string& datasetNameDesired);

  std::vector<Dataset> filterDatasetsByReference(const std::vector<Dataset>& datasets,
    const std::string& datasetReferenceDesired);

  std::vector<Dataset> filterDatasetsByDefaultReference(const std::vector<Dataset>& datasets);

  std::vector<Dataset> filterDatasetsByTag(const std::vector<Dataset>& datasets, const std::string& versionTagDesired);

  std::string formatVersionCompatibility(const DatasetCompatibilityRange& compat);

  std::string formatDatasets(const std::vector<Dataset>& datasets, bool verbose = false);


  bool operator==(const DatasetCompatibilityRange& left, const DatasetCompatibilityRange& right);

  std::ostream& operator<<(std::ostream& os, const DatasetCompatibilityRange& range);

  bool operator==(const DatasetCompatibility& left, const DatasetCompatibility& right);

  std::ostream& operator<<(std::ostream& os, const DatasetCompatibility& compat);

  bool operator==(const DatasetVersion& left, const DatasetVersion& right);

  std::ostream& operator<<(std::ostream& os, const DatasetVersion& ver);

  bool operator==(const Dataset& left, const Dataset& right);

  std::ostream& operator<<(std::ostream& os, const Dataset& dataset);
}// namespace Nextclade
