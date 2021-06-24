#include "parseQcConfig.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <nlohmann/json.hpp>
#include <semver.hpp>

#include "parseAnalysisResults.h"
#include "qc/isQcConfigVersionRecent.h"


namespace Nextclade {
  using json = nlohmann::ordered_json;

  class ErrorParseQcConfigInvalid : public std::runtime_error {
  public:
    explicit ErrorParseQcConfigInvalid(const std::string& path)
        : std::runtime_error(fmt::format("key \"{:s}\" is missing", path)) {}
  };


  namespace {
    template<typename T>
    void readValue(const json& j, const std::string& path, T& value) {
      if (j.contains(json::json_pointer{path})) {
        value = j.at(json::json_pointer{path}).template get<T>();
      } else {
        throw ErrorParseQcConfigInvalid(path);
      }
    }

    template<typename T>
    void readValue(const json& j, const std::string& path, T& value, const T& defaultValue) {
      if (j.contains(json::json_pointer{path})) {
        value = j.at(json::json_pointer{path}).template get<T>();
      } else {
        value = defaultValue;
      }
    }

    template<typename T, typename Parser>
    void readArray(const json& j, const std::string& path, std::vector<T>& value, Parser parser) {
      if (j.contains(json::json_pointer{path})) {
        value = parseArray<T>(j, json::json_pointer{path}, parser);
      } else {
        throw ErrorParseQcConfigInvalid(path);
      }
    }
  }// namespace


  QcConfig parseQcConfig(const std::string& qcConfigJsonStr) {
    try {
      json j = json::parse(qcConfigJsonStr);

      QcConfig qcConfig{};

      // Version prior to 1.2.0 did not include "schemaVersion" field.
      // Treat files without this field as them as "1.1.0".
      readValue(j, "/schemaVersion", qcConfig.schemaVersion, std::string{"1.1.0"});


      readValue(j, "/missingData/enabled", qcConfig.missingData.enabled, false);
      if (qcConfig.missingData.enabled) {
        readValue(j, "/missingData/missingDataThreshold", qcConfig.missingData.missingDataThreshold);
        readValue(j, "/missingData/scoreBias", qcConfig.missingData.scoreBias);
      }

      readValue(j, "/mixedSites/enabled", qcConfig.mixedSites.enabled, false);
      if (qcConfig.mixedSites.enabled) {
        readValue(j, "/mixedSites/mixedSitesThreshold", qcConfig.mixedSites.mixedSitesThreshold);
      }

      readValue(j, "/privateMutations/enabled", qcConfig.privateMutations.enabled, false);
      if (qcConfig.privateMutations.enabled) {
        readValue(j, "/privateMutations/typical", qcConfig.privateMutations.typical);
        readValue(j, "/privateMutations/cutoff", qcConfig.privateMutations.cutoff);
      }

      readValue(j, "/snpClusters/enabled", qcConfig.snpClusters.enabled, false);
      if (qcConfig.snpClusters.enabled) {
        readValue(j, "/snpClusters/windowSize", qcConfig.snpClusters.windowSize);
        readValue(j, "/snpClusters/clusterCutOff", qcConfig.snpClusters.clusterCutOff);
        readValue(j, "/snpClusters/scoreWeight", qcConfig.snpClusters.scoreWeight);
      }

      readValue(j, "/frameShifts/enabled", qcConfig.frameShifts.enabled, false);

      readValue(j, "/stopCodons/enabled", qcConfig.stopCodons.enabled, false);
      if (qcConfig.stopCodons.enabled) {
        readArray(j, "/stopCodons/ignoredStopCodons", qcConfig.stopCodons.ignoredStopCodons, parseStopCodonLocation);
      }

      return qcConfig;
    } catch (const std::exception& e) {
      throw ErrorFatal(fmt::format("When parsing QC configuration file: {:s}", e.what()));
    }
  }

}// namespace Nextclade
