#include <Poco/URI.h>
#include <cpr/cpr.h>
#include <fmt/format.h>
#include <frozen/string.h>
#include <nextclade_common/datasets.h>
#include <nextclade_common/fetch.h>
#include <nextclade_json/nextclade_json.h>

#include <boost/algorithm/string/predicate.hpp>
#include <boost/algorithm/string/trim.hpp>
#include <nlohmann/json.hpp>
#include <semver.hpp>
#include <string>

namespace Nextclade {

  constexpr const frozen::string DATA_FULL_DOMAIN = "https://d2y3t6seg8c135.cloudfront.net";
  // constexpr const frozen::string DATA_FULL_DOMAIN = "http://localhost:27722";

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
        .geneMap = toAbsoluteUrl(at(j, "geneMap"), DATA_FULL_DOMAIN.data()),
        .primers = toAbsoluteUrl(at(j, "primers"), DATA_FULL_DOMAIN.data()),
        .qc = toAbsoluteUrl(at(j, "qc"), DATA_FULL_DOMAIN.data()),
        .reference = toAbsoluteUrl(at(j, "reference"), DATA_FULL_DOMAIN.data()),
        .sequences = toAbsoluteUrl(at(j, "sequences"), DATA_FULL_DOMAIN.data()),
        .tree = toAbsoluteUrl(at(j, "tree"), DATA_FULL_DOMAIN.data()),
      };
    }

    DatasetVersion parseVersion(const json& j) {
      return DatasetVersion{
        .datetime = at(j, "datetime"),
        .comment = at(j, "comment"),
        .compatibility = parseDatasetCompatibility(at(j, "compatibility")),
        .files = parseDatasetFiles(at(j, "files")),
        .zipBundle = toAbsoluteUrl(at(j, "zipBundle"), DATA_FULL_DOMAIN.data()),
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
      return (thisVersion >= min && thisVersion <= max);
    }

  }//namespace

  DatasetsJson fetchDatasetsJson() {
    const std::string url = toAbsoluteUrl("/_generated/datasets.json", DATA_FULL_DOMAIN.data());
    const auto& datasetsJsonStr = fetch(url);
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

  std::vector<Dataset> filterDatasetsByName(const std::vector<Dataset>& datasets,
    const std::string& datasetNameDesired) {
    std::vector<Dataset> datasetsFiltered;
    std::copy_if(datasets.cbegin(), datasets.cend(), std::back_inserter(datasetsFiltered),
      [&datasetNameDesired](const Dataset& dataset) { return dataset.name == datasetNameDesired; });
    return datasetsFiltered;
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
      fmt::format_to(buf, "{:s} (id: {:s})\n", dataset.nameFriendly, dataset.name);
      fmt::format_to(buf, "{:s}\n", dataset.description);
      fmt::format_to(buf, "Versions ({:d}):\n\n", dataset.versions.size());
      for (const auto& version : dataset.versions) {
        fmt::format_to(buf, "  Datetime              : {:s}\n", version.datetime);
        fmt::format_to(buf, "  Comment               : {:s}\n", version.comment);

        fmt::format_to(buf, "  Nextclade CLI compat. : {:s}\n",
          formatVersionCompatibility(version.compatibility.nextcladeCli));
        fmt::format_to(buf, "  Nextclade Web compat. : {:s}\n",
          formatVersionCompatibility(version.compatibility.nextcladeWeb));

        fmt::format_to(buf, "\n");

        fmt::format_to(buf, "  Zip bundle            : {:s}\n", version.zipBundle);

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

}// namespace Nextclade
