#pragma once

namespace Nextclade {
  struct AnalysisResult;

  /**
   * Checks if a nucleotide at a given position is sequenced
   */
  bool isSequenced(int pos, const AnalysisResult& analysisResult);
}// namespace Nextclade
