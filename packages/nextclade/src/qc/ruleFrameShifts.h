#pragma once

#include <optional>
#include <vector>


namespace Nextclade {
  struct AnalysisResult;
  struct QCRulesConfigFrameShifts;
  struct QcResultFrameShifts;

  std::optional<QcResultFrameShifts> ruleFrameShifts(//
    const AnalysisResult& analysisResult,            //
    const QCRulesConfigFrameShifts& config           //
  );
}// namespace Nextclade
