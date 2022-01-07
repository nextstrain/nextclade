#pragma once


#include <map>
#include <optional>
#include <ostream>
#include <string>
#include <common/safe_vector.h>

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
    safe_vector<DatasetVersion> versions;
  };

  struct Dataset {
    bool enabled;
    std::string name;
    std::string nameFriendly;
    safe_vector<DatasetRef> datasetRefs;
    std::string defaultRef;
  };

  struct DatasetsIndexJson {
    DatasetsSettings settings;
    safe_vector<Dataset> datasets;
  };

  DatasetsIndexJson fetchDatasetsIndexJson();

  void fetchDatasetVersion(const DatasetVersion& version, const std::string& outDir);

  safe_vector<Dataset> getEnabledDatasets(const safe_vector<Dataset>& datasets);

  safe_vector<Dataset> getCompatibleDatasets(const safe_vector<Dataset>& datasets, const std::string& thisVersion);

  safe_vector<Dataset> getLatestDatasets(const safe_vector<Dataset>& datasets);

  safe_vector<Dataset> getLatestCompatibleDatasets(const safe_vector<Dataset>& datasets,
    const std::string& thisVersion);

  safe_vector<Dataset> filterDatasetsByName(const safe_vector<Dataset>& datasets,
    const std::string& datasetNameDesired);

  safe_vector<Dataset> filterDatasetsByReference(const safe_vector<Dataset>& datasets,
    const std::string& datasetReferenceDesired);

  safe_vector<Dataset> filterDatasetsByDefaultReference(const safe_vector<Dataset>& datasets);

  safe_vector<Dataset> filterDatasetsByTag(const safe_vector<Dataset>& datasets, const std::string& versionTagDesired);

  std::string formatVersionCompatibility(const DatasetCompatibilityRange& compat);

  std::string formatDatasets(const safe_vector<Dataset>& datasets, bool verbose = false);


  bool operator==(const DatasetCompatibilityRange& left, const DatasetCompatibilityRange& right);

  std::ostream& operator<<(std::ostream& os, const DatasetCompatibilityRange& range);

  bool operator==(const DatasetCompatibility& left, const DatasetCompatibility& right);

  std::ostream& operator<<(std::ostream& os, const DatasetCompatibility& compat);

  bool operator==(const DatasetVersion& left, const DatasetVersion& right);

  std::ostream& operator<<(std::ostream& os, const DatasetVersion& ver);

  bool operator==(const Dataset& left, const Dataset& right);

  std::ostream& operator<<(std::ostream& os, const Dataset& dataset);
}// namespace Nextclade
