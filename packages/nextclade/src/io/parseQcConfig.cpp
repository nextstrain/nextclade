#include "parseQcConfig.h"

#include <nextclade/nextclade.h>

#include <nlohmann/json.hpp>


namespace Nextclade {

  using json = nlohmann::ordered_json;

  namespace {
    template<typename T>
    void readValue(const json& j, const std::string& path, T& value) {
      value = j.at(json::json_pointer{path}).template get<T>();
    }
  }// namespace

  QcConfig parseQcConfig(const std::string& qcConfigJsonStr) {
    json j = json::parse(qcConfigJsonStr);

    QcConfig qcConfig{};

    readValue(j, "/missingData/enabled", qcConfig.missingData.enabled);
    readValue(j, "/missingData/missingDataThreshold", qcConfig.missingData.missingDataThreshold);
    readValue(j, "/missingData/scoreBias", qcConfig.missingData.scoreBias);


    readValue(j, "/mixedSites/enabled", qcConfig.mixedSites.enabled);
    readValue(j, "/mixedSites/mixedSitesThreshold", qcConfig.mixedSites.mixedSitesThreshold);


    readValue(j, "/privateMutations/enabled", qcConfig.privateMutations.enabled);
    readValue(j, "/privateMutations/typical", qcConfig.privateMutations.typical);
    readValue(j, "/privateMutations/cutoff", qcConfig.privateMutations.cutoff);


    readValue(j, "/snpClusters/enabled", qcConfig.snpClusters.enabled);
    readValue(j, "/snpClusters/windowSize", qcConfig.snpClusters.windowSize);
    readValue(j, "/snpClusters/clusterCutOff", qcConfig.snpClusters.clusterCutOff);
    readValue(j, "/snpClusters/scoreWeight", qcConfig.snpClusters.scoreWeight);

    return qcConfig;
  }

}// namespace Nextclade
