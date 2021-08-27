#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade_json/nextclade_json.h>

#include <nlohmann/json.hpp>

#include "serializeResults.h"

namespace Nextclade {
  using json = nlohmann::ordered_json;

  namespace {
    template<typename T>
    void writeValue(json& j, const std::string& path, const T& value) {
      j[json::json_pointer{path}] = value;
    }

    template<typename T, typename Serializer>
    void writeArray(json& j, const std::string& path, const std::vector<T>& value, Serializer serializer) {
      j[json::json_pointer{path}] = serializeArray(value, serializer);
    }
  }// namespace

  std::string serializeQcConfig(Nextclade::QcConfig& qcConfig) {
    auto j = json::object();

    writeValue(j, "/schemaVersion", std::string{Nextclade::getVersion()});

    writeValue(j, "/missingData/enabled", qcConfig.missingData.enabled);
    if (qcConfig.missingData.enabled) {
      writeValue(j, "/missingData/missingDataThreshold", qcConfig.missingData.missingDataThreshold);
      writeValue(j, "/missingData/scoreBias", qcConfig.missingData.scoreBias);
    }

    writeValue(j, "/mixedSites/enabled", qcConfig.mixedSites.enabled);
    if (qcConfig.mixedSites.enabled) {
      writeValue(j, "/mixedSites/mixedSitesThreshold", qcConfig.mixedSites.mixedSitesThreshold);
    }

    writeValue(j, "/privateMutations/enabled", qcConfig.privateMutations.enabled);
    if (qcConfig.privateMutations.enabled) {
      writeValue(j, "/privateMutations/typical", qcConfig.privateMutations.typical);
      writeValue(j, "/privateMutations/cutoff", qcConfig.privateMutations.cutoff);
    }

    writeValue(j, "/snpClusters/enabled", qcConfig.snpClusters.enabled);
    if (qcConfig.privateMutations.enabled) {
      writeValue(j, "/snpClusters/windowSize", qcConfig.snpClusters.windowSize);
      writeValue(j, "/snpClusters/clusterCutOff", qcConfig.snpClusters.clusterCutOff);
      writeValue(j, "/snpClusters/scoreWeight", qcConfig.snpClusters.scoreWeight);
    }

    writeValue(j, "/frameShifts/enabled", qcConfig.frameShifts.enabled);

    writeValue(j, "/stopCodons/enabled", qcConfig.stopCodons.enabled);
    if (qcConfig.stopCodons.enabled) {
      writeArray(j, "/stopCodons/ignoredStopCodons", qcConfig.stopCodons.ignoredStopCodons, serializeStopCodon);
    }

    return jsonStringify(j);
  }
}// namespace Nextclade
