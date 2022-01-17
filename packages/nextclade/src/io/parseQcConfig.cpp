#include "parseQcConfig.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <nlohmann/json.hpp>
#include <semver.hpp>

#include "parseAnalysisResults.h"
#include "qc/isQcConfigVersionRecent.h"


namespace Nextclade {
  using json = nlohmann::ordered_json;

  class ErrorQcConfigParsingFailed : public ErrorFatal {
  public:
    explicit ErrorQcConfigParsingFailed(const std::string& message)
        : ErrorFatal(fmt::format("When parsing QC configuration file: {:s}", message)) {}
  };

  QcConfig parseQcConfig(const std::string& qcConfigJsonStr) {
    try {
      json j = json::parse(qcConfigJsonStr);

      QcConfig qcConfig{};

      // Prior to 1.2.0 qc.json did not include "schemaVersion" field. Treat files without this field as "1.1.0".
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
      if (qcConfig.frameShifts.enabled) {
        readArrayMaybe(j, "/frameShifts/ignoredFrameShifts", qcConfig.frameShifts.ignoredFrameShifts,
          parseFrameShiftLocation);
      }

      readValue(j, "/stopCodons/enabled", qcConfig.stopCodons.enabled, false);
      if (qcConfig.stopCodons.enabled) {
        readArrayOrThrow(j, "/stopCodons/ignoredStopCodons", qcConfig.stopCodons.ignoredStopCodons,
          parseStopCodonLocation);
      }

      return qcConfig;
    } catch (const std::exception& e) {
      throw ErrorQcConfigParsingFailed(e.what());
    }
  }

}// namespace Nextclade
