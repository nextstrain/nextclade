#include <nextclade/nextclade.h>

#include <nlohmann/json.hpp>

#include "jsonStringify.h"

namespace Nextclade {
  using json = nlohmann::ordered_json;

  namespace {
    template<typename T>
    void writeValue(json& j, const std::string& path, T& value) {
      j[json::json_pointer{path}] = value;
    }
  }// namespace

  std::string serializeQcConfig(Nextclade::QcConfig& qcConfig) {
    auto j = json::object();

    writeValue(j, "/missingData/enabled", qcConfig.missingData.enabled);
    writeValue(j, "/missingData/missingDataThreshold", qcConfig.missingData.missingDataThreshold);
    writeValue(j, "/missingData/scoreBias", qcConfig.missingData.scoreBias);


    writeValue(j, "/mixedSites/enabled", qcConfig.mixedSites.enabled);
    writeValue(j, "/mixedSites/mixedSitesThreshold", qcConfig.mixedSites.mixedSitesThreshold);


    writeValue(j, "/privateMutations/enabled", qcConfig.privateMutations.enabled);
    writeValue(j, "/privateMutations/typical", qcConfig.privateMutations.typical);
    writeValue(j, "/privateMutations/cutoff", qcConfig.privateMutations.cutoff);


    writeValue(j, "/snpClusters/enabled", qcConfig.snpClusters.enabled);
    writeValue(j, "/snpClusters/windowSize", qcConfig.snpClusters.windowSize);
    writeValue(j, "/snpClusters/clusterCutOff", qcConfig.snpClusters.clusterCutOff);
    writeValue(j, "/snpClusters/scoreWeight", qcConfig.snpClusters.scoreWeight);

    writeValue(j, "/frameShifts/enabled", qcConfig.frameShifts.enabled);

    writeValue(j, "/stopCodons/enabled", qcConfig.stopCodons.enabled);

    return jsonStringify(j);
  }
}// namespace Nextclade
