#pragma once

namespace Nextclade {
  struct NextcladeResultIntermediate;

  /**
   * Checks if a nucleotide at a given position is sequenced
   */
  bool isSequenced(int pos, const NextcladeResultIntermediate& analysisResult);
}// namespace Nextclade
