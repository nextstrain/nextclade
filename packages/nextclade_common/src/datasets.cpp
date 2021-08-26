#include <Poco/URI.h>
#include <fmt/format.h>
#include <frozen/string.h>
#include <nextclade_common/datasets.h>
#include <nextclade_common/fetch.h>
#include <nextclade_common/openOutputFile.h>
#include <nextclade_json/nextclade_json.h>
#include <tbb/task_group.h>

#include <boost/algorithm/string.hpp>
#include <boost/algorithm/string/split.hpp>
#include <nlohmann/json.hpp>
#include <semver.hpp>
#include <string>

namespace Nextclade {

  // The macro `DATA_FULL_DOMAIN` comes from the build system and can be set in the root `.env` file
  constexpr const frozen::string dataFullDomain = DATA_FULL_DOMAIN;

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


    std::string toAbsoluteUrl(const std::string& url, const std::string& fullDomain) {
      if (!Poco::URI(url).isRelative()) {
        return url;
      }
      return Poco::URI(Poco::URI(fullDomain), url).toString();
    }

    DatasetFiles parseDatasetFiles(const json& j) {
      auto files = j.get<std::map<std::string, std::string>>();

      for (auto& [key, value] : files) {
        value = toAbsoluteUrl(value, dataFullDomain.data());
      }

      return files;
    }

    DatasetVersion parseVersion(const json& j) {
      return DatasetVersion{
        .enabled = at(j, "enabled"),
        .tag = at(j, "tag"),
        .comment = at(j, "comment"),
        .compatibility = parseDatasetCompatibility(at(j, "compatibility")),
        .files = parseDatasetFiles(at(j, "files")),
        .zipBundle = toAbsoluteUrl(at(j, "zipBundle"), dataFullDomain.data()),
      };
    }

    DatasetRefSeq parseRefSeq(const json& j) {
      return DatasetRefSeq{
        .accession = at(j, "accession"),
        .source = at(j, "source"),
        .strainName = at(j, "strainName"),
      };
    }

    DatasetRef parseDatasetRef(const json& j) {
      return DatasetRef{
        .enabled = at(j, "enabled"),
        .reference = parseRefSeq(at(j, "reference")),
        .versions = parseArray<DatasetVersion>(j, "versions", parseVersion),
      };
    }

    Dataset parseDataset(const json& j) {
      return Dataset{
        .enabled = at(j, "enabled"),
        .name = at(j, "name"),
        .nameFriendly = at(j, "nameFriendly"),
        .description = at(j, "description"),
        .datasetRefs = parseArray<DatasetRef>(j, "datasetRefs", parseDatasetRef),
        .defaultRef = at(j, "defaultRef"),
      };
    }

    DatasetsIndexJson parseDatasetsJson(const std::string& datasetsIndexJsonStr) {
      const auto j = json::parse(datasetsIndexJsonStr);

      return DatasetsIndexJson{
        .settings = parseDatasetSettings(at(j, "settings")),
        .datasets = parseArray<Dataset>(j, "datasets", parseDataset),
      };
    }

    bool isDatasetVersionCompatible(const DatasetVersion& version, const std::string& thisVersionStr) {
      const auto thisVersion = semver::from_string(thisVersionStr);
      const auto min = semver::from_string(version.compatibility.nextcladeCli.min.value_or(thisVersionStr));
      const auto max = semver::from_string(version.compatibility.nextcladeCli.max.value_or(thisVersionStr));
      return (thisVersion >= min && thisVersion <= max);
    }

  }//namespace

  DatasetsIndexJson fetchDatasetsIndexJson() {
    const std::string url = toAbsoluteUrl("/index.json", dataFullDomain.data());
    const auto& datasetsIndexJsonStr = fetch(url);
    return parseDatasetsJson(datasetsIndexJsonStr);
  }

  void writeFile(const std::string& filepath, const std::string& content) {
    auto stream = openOutputFileMaybe(filepath);
    (*stream) << content;
  }

  void fetchDatasetVersion(const DatasetVersion& version, const std::string& outDir) {
    tbb::task_group taskGroup;

    for (const auto& [key, value] : version.files) {
      std::vector<std::string> urlParts;
      boost::algorithm::split(urlParts, value, boost::is_any_of("/"));
      const auto filename = urlParts.back();
      taskGroup.run([&] { writeFile(fs::path(outDir) / filename, fetch(value)); });
    }

    taskGroup.wait();
  }

  std::vector<Dataset> getEnabledDatasets(const std::vector<Dataset>& datasets) {
    std::vector<Dataset> datasetsEnabled;
    for (const auto& dataset : datasets) {
      if (!dataset.enabled) {
        continue;
      }

      auto enabledDataset = Dataset{dataset};
      enabledDataset.datasetRefs = {};
      for (const auto& datasetRef : dataset.datasetRefs) {
        auto enabledDatasetRef = DatasetRef{datasetRef};
        enabledDatasetRef.versions = {};

        for (const auto& version : datasetRef.versions) {
          if (version.enabled) {
            enabledDatasetRef.versions.push_back(version);
          }
        }

        if (!enabledDatasetRef.versions.empty()) {
          enabledDataset.datasetRefs.push_back(enabledDatasetRef);
        }
      }

      if (!enabledDataset.datasetRefs.empty()) {
        datasetsEnabled.push_back(enabledDataset);
      }
    }
    return datasetsEnabled;
  }

  std::vector<Dataset> getCompatibleDatasets(const std::vector<Dataset>& datasets, const std::string& thisVersion) {
    std::vector<Dataset> datasetsCompatible;
    for (const auto& dataset : datasets) {

      auto datasetCompatible = Dataset{dataset};
      datasetCompatible.datasetRefs = {};

      for (const auto& datasetRef : dataset.datasetRefs) {

        auto datasetRefCompatible = DatasetRef{datasetRef};
        datasetRefCompatible.versions = {};

        // Find compatible versions
        std::vector<DatasetVersion> versionsCompatible;
        for (const auto& version : datasetRef.versions) {
          if (isDatasetVersionCompatible(version, thisVersion)) {
            datasetRefCompatible.versions.push_back(version);
          }
        }

        // DatasetRef is compatible if there is at least one compatible version
        if (!datasetRefCompatible.versions.empty()) {
          datasetCompatible.datasetRefs.push_back(datasetRefCompatible);
        }
      }

      // Dataset is compatible if there is at least one compatible DatasetRef
      if (!datasetCompatible.datasetRefs.empty()) {
        datasetsCompatible.push_back(datasetCompatible);
      }
    }

    return datasetsCompatible;
  }

  std::vector<Dataset> getLatestDatasets(const std::vector<Dataset>& datasets) {
    std::vector<Dataset> datasetsLatest;
    for (const auto& dataset : datasets) {
      auto datasetLatest = Dataset{dataset};
      datasetLatest.datasetRefs = {};

      for (const auto& datasetRef : dataset.datasetRefs) {
        if (datasetRef.versions.empty()) {
          continue;
        }

        // Find latest version
        auto latestVersion = datasetRef.versions[0];
        for (const auto& version : datasetRef.versions) {
          if (version.tag > latestVersion.tag) {
            latestVersion = version;
          }
        }

        auto datasetRefLatest = DatasetRef{datasetRef};
        datasetRefLatest.versions = {std::move(latestVersion)};
        datasetLatest.datasetRefs.push_back(datasetRefLatest);
      }

      if (!datasetLatest.datasetRefs.empty()) {
        datasetsLatest.push_back(datasetLatest);
      }
    }

    return datasetsLatest;
  }

  std::vector<Dataset> getLatestCompatibleDatasets(const std::vector<Dataset>& datasets,
    const std::string& thisVersion) {
    return getLatestDatasets(getCompatibleDatasets(datasets, thisVersion));
  }

  std::vector<Dataset> filterDatasetsByName(const std::vector<Dataset>& datasets,
    const std::string& datasetNameDesired) {
    std::vector<Dataset> datasetsFiltered;
    std::copy_if(datasets.cbegin(), datasets.cend(), std::back_inserter(datasetsFiltered),
      [&datasetNameDesired](const Dataset& dataset) { return dataset.name == datasetNameDesired; });
    return datasetsFiltered;
  }

  std::vector<Dataset> filterDatasetsByTag(const std::vector<Dataset>& datasets, const std::string& versionTagDesired) {
    std::vector<Dataset> datasetsVersioned;
    for (const auto& dataset : datasets) {
      auto datasetVersioned = Dataset{dataset};
      datasetVersioned.datasetRefs = {};

      for (const auto& datasetRef : dataset.datasetRefs) {
        // Extract only the requested version
        const auto& found = std::find_if(datasetRef.versions.cbegin(), datasetRef.versions.cend(),
          [&versionTagDesired](const DatasetVersion& version) { return version.tag == versionTagDesired; });

        if (found != datasetRef.versions.cend()) {
          // Remember this dataset ref, but among all versions in it only keep the desired version
          DatasetRef datasetRefVersioned{datasetRef};
          datasetRefVersioned.versions = {DatasetVersion{*found}};
          datasetVersioned.datasetRefs.emplace_back(std::move(datasetRefVersioned));
        }
      }

      if (!datasetVersioned.datasetRefs.empty()) {
        datasetsVersioned.emplace_back(std::move(datasetVersioned));
      }
    }

    return datasetsVersioned;
  }

  std::string formatVersionCompatibility(const DatasetCompatibilityRange& compat) {
    if (!compat.min && compat.max) {
      return fmt::format("up to {:}", *compat.max);
    }

    if (compat.min && !compat.max) {
      return fmt::format("from {:}", *compat.min);
    }

    if (compat.min && compat.max) {
      return fmt::format("from {:} to {:}", *compat.min, *compat.max);
    }

    return "unknown";
  }

  std::string formatDatasets(const std::vector<Dataset>& datasets) {
    fmt::memory_buffer buf;
    for (const auto& dataset : datasets) {
      fmt::format_to(buf, "{:s} (name: {:s})\n", dataset.nameFriendly, dataset.name);
      fmt::format_to(buf, "{:s}\n\n", dataset.description);

      for (const auto& datasetRef : dataset.datasetRefs) {
        const auto& ref = datasetRef.reference;
        fmt::format_to(buf, "  Reference: {:s} ({:s}: {:s})\n\n", ref.strainName, ref.source, ref.accession);

        fmt::format_to(buf,
          "  Fetch the latest version of this dataset with:\n\n    nextclade dataset get --name='{}' "
          "--reference='{}'\n\n",
          dataset.name, ref.accession);

        fmt::format_to(buf, "  Versions ({:d}):\n\n", datasetRef.versions.size());
        for (const auto& version : datasetRef.versions) {
          fmt::format_to(buf, "    Tag                   : {:s}\n", version.tag);
          fmt::format_to(buf, "    Comment               : {:s}\n", version.comment);

          fmt::format_to(buf, "    Nextclade CLI compat. : {:s}\n",
            formatVersionCompatibility(version.compatibility.nextcladeCli));
          fmt::format_to(buf, "    Nextclade Web compat. : {:s}\n",
            formatVersionCompatibility(version.compatibility.nextcladeWeb));

          fmt::format_to(buf, "\n");

          fmt::format_to(buf, "    Zip bundle            : {:s}\n", version.zipBundle);

          fmt::format_to(buf, "\n");

          fmt::format_to(buf, "    Version tag file      : {:s}\n", version.files.at("tag"));

          fmt::format_to(buf, "\n");

          fmt::format_to(buf, "    Files:\n");
          fmt::format_to(buf, "      Reference sequence  : {:s}\n", version.files.at("reference"));
          fmt::format_to(buf, "      Reference tree      : {:s}\n", version.files.at("tree"));
          fmt::format_to(buf, "      Gene map            : {:s}\n", version.files.at("geneMap"));
          fmt::format_to(buf, "      QC configuration    : {:s}\n", version.files.at("qc"));
          fmt::format_to(buf, "      PCR primers         : {:s}\n", version.files.at("primers"));
          fmt::format_to(buf, "      Example sequences   : {:s}\n", version.files.at("sequences"));

          fmt::format_to(buf, "\n");

          fmt::format_to(buf,
            "    Fetch this particular version of this dataset with:\n\n    nextclade dataset get --name='{}' "
            "--reference='{}' --tag='{}'\n\n",
            dataset.name, ref.accession, version.tag);


          fmt::format_to(buf, "\n");
        }
      }
      fmt::format_to(buf, "\n");
    }
    return fmt::to_string(buf);
  }


  bool operator==(const DatasetCompatibilityRange& left, const DatasetCompatibilityRange& right) {
    return left.min == right.min && left.max == right.max;
  }

  std::ostream& operator<<(std::ostream& os, const DatasetCompatibilityRange& range) {
    os << "{ " << range.min.value_or("*") << " ; " << range.max.value_or("*") << " }";
    return os;
  }

  bool operator==(const DatasetCompatibility& left, const DatasetCompatibility& right) {
    return left.nextcladeCli == right.nextcladeCli && left.nextcladeWeb == right.nextcladeWeb;
  }

  std::ostream& operator<<(std::ostream& os, const DatasetCompatibility& compat) {
    os << "cli: " << compat.nextcladeCli << ", ";
    os << "web: " << compat.nextcladeWeb << "";
    return os;
  }

  bool operator==(const DatasetVersion& left, const DatasetVersion& right) {
    return left.enabled == right.enabled && left.tag == right.tag && left.compatibility == right.compatibility;
  }

  std::ostream& operator<<(std::ostream& os, const DatasetVersion& ver) {
    os << "{ "
       << "\n";
    os << "  "
          "enabled: "
       << ver.enabled << "\n";
    os << "  "
       << "tag: " << ver.tag << "\n";
    os << "  "
       << "comment: " << ver.comment << "\n";
    os << "  "
       << "compatibility: " << ver.compatibility << "\n";
    os << "}";
    return os;
  }

  bool operator==(const DatasetRefSeq& left, const DatasetRefSeq& right) {
    return left.accession == right.accession && left.source == right.source && left.strainName == right.strainName;
  }

  std::ostream& operator<<(std::ostream& os, const DatasetRefSeq& datasetRef) {
    os << "\n{\n";
    os << "  "
          "accession: "
       << datasetRef.accession << "\n";
    os << "  "
          "strainName: "
       << datasetRef.strainName << "\n";
    os << "  "
          "source: "
       << datasetRef.source << "\n";
    os << "}\n";
    return os;
  }


  bool operator==(const DatasetRef& left, const DatasetRef& right) {
    return left.reference == right.reference && left.reference == right.reference;
  }

  std::ostream& operator<<(std::ostream& os, const DatasetRef& datasetRef) {
    os << "\n{\n";
    os << "  "
          "reference: "
       << datasetRef.reference << "\n";
    os << "  "
          "enabled: "
       << datasetRef.enabled << "\n";
    os << "  "
          "versions: [\n";
    for (const auto& version : datasetRef.versions) {
      os << version << ",\n";
    }
    os << "}\n";
    return os;
  }

  bool operator==(const Dataset& left, const Dataset& right) {
    return left.name == right.name && left.datasetRefs == right.datasetRefs;
  }

  std::ostream& operator<<(std::ostream& os, const Dataset& dataset) {
    os << "\n{\n";
    os << "  "
          "name: "
       << dataset.name << "\n";
    os << "  "
          "enabled: "
       << dataset.enabled << "\n";
    os << "  "
          "nameFriendly: "
       << dataset.nameFriendly << "\n";
    os << "  "
          "description: "
       << dataset.description << "\n";
    os << "  "
          "datasetRefs: [\n";
    for (const auto& datasetRef : dataset.datasetRefs) {
      os << datasetRef << ",\n";
    }
    os << "}\n";
    return os;
  }
}// namespace Nextclade
