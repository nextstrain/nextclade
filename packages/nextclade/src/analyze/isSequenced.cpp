#include "isSequenced.h"

#include <nextclade/nextclade.h>

#include "../utils/range.h"

namespace Nextclade {
  bool isSequenced(int pos, const AnalysisResult& analysisResult) {
    // Make sure position does not belong to a missing fragment
    for (const auto& missing : analysisResult.missing) {
      if (inRange(pos, missing.begin, missing.end)) {
        return false;
      }
    }

    // Make sure position belongs to alignment range
    return inRange(pos, analysisResult.alignmentStart, analysisResult.alignmentEnd);
  }
}// namespace Nextclade
