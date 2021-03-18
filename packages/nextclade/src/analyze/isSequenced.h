#pragma once

namespace Nextclade {
  struct NextcladeResult;

  /**
   * Checks if a nucleotide at a given position is sequenced
   */
  bool isSequenced(int pos, const NextcladeResult& analysisResult);
}// namespace Nextclade
