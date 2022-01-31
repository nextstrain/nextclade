#include "ruleFrameShifts.h"

#include <nextalign/private/nextalign_private.h>
#include <nextclade/nextclade.h>

#include <optional>

#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"

namespace Nextclade {
  bool isFrameShiftIgnored(const FrameShiftResult& frameShift,
    const safe_vector<FrameShiftLocation>& ignoredFrameShifts) {
    for (const auto& ignoredFrameShift : ignoredFrameShifts) {
      if (frameShift.geneName == ignoredFrameShift.geneName && frameShift.codon == ignoredFrameShift.codonRange) {
        return true;
      }
    }
    return false;
  }

  void filterFrameShifts(const safe_vector<FrameShiftResult>& frameShifts, const QCRulesConfigFrameShifts& config,
    safe_vector<FrameShiftResult>& frameShiftsReported, safe_vector<FrameShiftResult>& frameShiftsIgnored) {
    for (const auto& frameShift : frameShifts) {
      if (isFrameShiftIgnored(frameShift, config.ignoredFrameShifts)) {
        frameShiftsIgnored.push_back(frameShift);
      } else {
        frameShiftsReported.push_back(frameShift);
      }
    }
  }

  std::optional<QcResultFrameShifts> ruleFrameShifts(//
    const AnalysisResult& analysisResult,            //
    const QCRulesConfigFrameShifts& config           //
  ) {
    if (!config.enabled) {
      return {};
    }

    safe_vector<FrameShiftResult> frameShiftsReported;
    safe_vector<FrameShiftResult> frameShiftsIgnored;
    filterFrameShifts(analysisResult.frameShifts, config, frameShiftsReported, frameShiftsIgnored);
    const int totalFrameShiftsReported = safe_cast<int>(frameShiftsReported.size());
    const int totalFrameShiftsIgnored = safe_cast<int>(frameShiftsIgnored.size());

    const double score = totalFrameShiftsReported * 75;
    const auto& status = getQcRuleStatus(score);

    return QcResultFrameShifts{
      .score = score,
      .status = status,
      .frameShifts = frameShiftsReported,
      .totalFrameShifts = totalFrameShiftsReported,
      .frameShiftsIgnored = frameShiftsIgnored,
      .totalFrameShiftsIgnored = totalFrameShiftsIgnored,
    };
  }
}// namespace Nextclade
