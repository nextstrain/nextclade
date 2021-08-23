#include <Poco/URI.h>
#include <fmt/format.h>
#include <frozen/string.h>
#include <nextclade_common/datasets.h>
#include <nextclade_common/fetch.h>
#include <nextclade_common/openOutputFile.h>
#include <nextclade_json/nextclade_json.h>
#include <tbb/task_group.h>

#include <boost/algorithm/string/predicate.hpp>
#include <boost/algorithm/string/trim.hpp>
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
      return DatasetFiles{
        .geneMap = toAbsoluteUrl(at(j, "geneMap"), dataFullDomain.data()),
        .primers = toAbsoluteUrl(at(j, "primers"), dataFullDomain.data()),
        .qc = toAbsoluteUrl(at(j, "qc"), dataFullDomain.data()),
        .reference = toAbsoluteUrl(at(j, "reference"), dataFullDomain.data()),
        .sequences = toAbsoluteUrl(at(j, "sequences"), dataFullDomain.data()),
        .tree = toAbsoluteUrl(at(j, "tree"), dataFullDomain.data()),
        .tag = toAbsoluteUrl(at(j, "tag"), dataFullDomain.data()),
      };
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

    Dataset parseDataset(const json& j) {
      return Dataset{
        .enabled = at(j, "enabled"),
        .name = at(j, "name"),
        .nameFriendly = at(j, "nameFriendly"),
        .description = at(j, "description"),
        .referenceSequence = at(j, "referenceSequence"),
        .versions = parseArray<DatasetVersion>(j, "versions", parseVersion),
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
    taskGroup.run([&] { writeFile(fs::path(outDir) / "reference.fasta", fetch(version.files.reference)); });
    taskGroup.run([&] { writeFile(fs::path(outDir) / "tree.json", fetch(version.files.tree)); });
    taskGroup.run([&] { writeFile(fs::path(outDir) / "genemap.gff", fetch(version.files.geneMap)); });
    taskGroup.run([&] { writeFile(fs::path(outDir) / "primers.csv", fetch(version.files.primers)); });
    taskGroup.run([&] { writeFile(fs::path(outDir) / "qc.json", fetch(version.files.qc)); });
    taskGroup.run([&] { writeFile(fs::path(outDir) / "tag.json", fetch(version.files.tag)); });
    taskGroup.wait();
  }

  std::vector<Dataset> getEnabledDatasets(const std::vector<Dataset>& datasets) {
    std::vector<Dataset> datasetsEnabled;
    for (const auto& dataset : datasets) {
      if (!dataset.enabled) {
        continue;
      }

      auto enabledDataset = Dataset{dataset};
      enabledDataset.versions = {};
      for (const auto& version : dataset.versions) {
        if (version.enabled) {
          enabledDataset.versions.push_back(version);
        }
      }

      if (!enabledDataset.versions.empty()) {
        datasetsEnabled.push_back(dataset);
      }
    }
    return datasetsEnabled;
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
        if (version.tag > latestVersion.tag) {
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

  std::vector<Dataset> filterDatasetsByName(const std::vector<Dataset>& datasets,
    const std::string& datasetNameDesired) {
    std::vector<Dataset> datasetsFiltered;
    std::copy_if(datasets.cbegin(), datasets.cend(), std::back_inserter(datasetsFiltered),
      [&datasetNameDesired](const Dataset& dataset) { return dataset.name == datasetNameDesired; });
    return datasetsFiltered;
  }

  std::vector<Dataset> filterDatasetsByVersion(const std::vector<Dataset>& datasets,
    const std::string& datasetVersionDesired) {
    std::vector<Dataset> datasetsVersioned;
    for (const auto& dataset : datasets) {
      // Extract only the requested version
      const auto& found = std::find_if(dataset.versions.cbegin(), dataset.versions.cend(),
        [&datasetVersionDesired](const DatasetVersion& version) { return version.tag == datasetVersionDesired; });

      if (found != dataset.versions.cend()) {
        // Remember this dataset, but only among all versions in it only keep the desired version
        Dataset datasetVersioned{dataset};
        datasetVersioned.versions = {DatasetVersion{*found}};
        datasetsVersioned.emplace_back(datasetVersioned);
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
      fmt::format_to(buf, "{:s}\n", dataset.description);
      fmt::format_to(buf, "Versions ({:d}):\n\n", dataset.versions.size());
      for (const auto& version : dataset.versions) {
        fmt::format_to(buf, "  Tag                   : {:s}\n", version.tag);
        fmt::format_to(buf, "  Comment               : {:s}\n", version.comment);

        fmt::format_to(buf, "  Nextclade CLI compat. : {:s}\n",
          formatVersionCompatibility(version.compatibility.nextcladeCli));
        fmt::format_to(buf, "  Nextclade Web compat. : {:s}\n",
          formatVersionCompatibility(version.compatibility.nextcladeWeb));

        fmt::format_to(buf, "\n");

        fmt::format_to(buf, "  Zip bundle            : {:s}\n", version.zipBundle);

        fmt::format_to(buf, "\n");

        fmt::format_to(buf, "  Version tag file      : {:s}\n", version.files.tag);

        fmt::format_to(buf, "\n");

        fmt::format_to(buf, "  Files:\n");
        fmt::format_to(buf, "    Reference sequence  : {:s}\n", version.files.reference);
        fmt::format_to(buf, "    Reference tree      : {:s}\n", version.files.tree);
        fmt::format_to(buf, "    Gene map            : {:s}\n", version.files.geneMap);
        fmt::format_to(buf, "    QC configuration    : {:s}\n", version.files.qc);
        fmt::format_to(buf, "    PCR primers         : {:s}\n", version.files.primers);
        fmt::format_to(buf, "    Example sequences   : {:s}\n", version.files.sequences);

        fmt::format_to(buf, "\n");
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

  bool operator==(const Dataset& left, const Dataset& right) {
    return left.name == right.name && left.versions == right.versions;
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
          "referenceSequence: "
       << dataset.referenceSequence << "\n";
    os << "  "
          "versions: [\n";
    for (const auto& version : dataset.versions) {
      os << version << ",\n";
    }
    os << "}\n";
    return os;
  }
}// namespace Nextclade
