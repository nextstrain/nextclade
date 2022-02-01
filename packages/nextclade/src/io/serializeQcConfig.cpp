#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade_json/nextclade_json.h>

#include <nlohmann/json.hpp>

#include "serializeResults.h"

namespace Nextclade {
  using json = nlohmann::ordered_json;


  std::string serializeQcConfig(Nextclade::QcConfig& qcConfig) {
    auto j = json::object();

    writeValue(j, "/schemaVersion", qcConfig.schemaVersion);

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
      // clang-format off
      writeValue(j, "/privateMutations/typical", qcConfig.privateMutations.typical);
      writeValue(j, "/privateMutations/cutoff", qcConfig.privateMutations.cutoff);
      writeValue(j, "/privateMutations/weightReversionSubstitutions", qcConfig.privateMutations.weightReversionSubstitutions);
      writeValue(j, "/privateMutations/weightReversionDeletions", qcConfig.privateMutations.weightReversionDeletions);
      writeValue(j, "/privateMutations/weightLabeledSubstitutions", qcConfig.privateMutations.weightLabeledSubstitutions);
      writeValue(j, "/privateMutations/weightLabeledDeletions", qcConfig.privateMutations.weightLabeledDeletions);
      writeValue(j, "/privateMutations/weightUnlabeledSubstitutions", qcConfig.privateMutations.weightUnlabeledSubstitutions);
      writeValue(j, "/privateMutations/weightUnlabeledDeletions", qcConfig.privateMutations.weightUnlabeledDeletions);
      // clang-format on
    }

    writeValue(j, "/snpClusters/enabled", qcConfig.snpClusters.enabled);
    if (qcConfig.snpClusters.enabled) {
      writeValue(j, "/snpClusters/windowSize", qcConfig.snpClusters.windowSize);
      writeValue(j, "/snpClusters/clusterCutOff", qcConfig.snpClusters.clusterCutOff);
      writeValue(j, "/snpClusters/scoreWeight", qcConfig.snpClusters.scoreWeight);
    }

    writeValue(j, "/frameShifts/enabled", qcConfig.frameShifts.enabled);
    if (qcConfig.frameShifts.enabled) {
      writeArray(j, "/frameShifts/ignoredFrameShifts", qcConfig.frameShifts.ignoredFrameShifts,
        serializeFrameShiftLocation);
    }

    writeValue(j, "/stopCodons/enabled", qcConfig.stopCodons.enabled);
    if (qcConfig.stopCodons.enabled) {
      writeArray(j, "/stopCodons/ignoredStopCodons", qcConfig.stopCodons.ignoredStopCodons, serializeStopCodon);
    }

    return jsonStringify(j);
  }
}// namespace Nextclade
