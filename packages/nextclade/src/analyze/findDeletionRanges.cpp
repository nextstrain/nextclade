#include "findDeletionRanges.h"

#include <common/copy.h>
#include <common/safe_vector.h>
#include <nextclade/nextclade.h>

#include "utils/safe_cast.h"

namespace Nextclade {

  /**
   * Finds all contiguous ranges of private nucleotide deletions.
   *
   * By contrast with nucleotide deletions (the `.deletions` field in the `AnalysisResult`), which are listed in the
   * form of ranges, private nucleotide deletions are listed
   * individually. We compute the ranges for private deletions here.
   */
  safe_vector<NucleotideRange> findDeletionRanges(const safe_vector<NucleotideDeletionSimple>& privateDeletions) {
    if (privateDeletions.empty()) {
      return {};
    }

    // Sort deletions by position, so that later we can tell which ones are adjacent.
    safe_vector<NucleotideDeletionSimple> dels = copy(privateDeletions);
    std::sort(dels.begin(), dels.end());

    // This will be the result.
    safe_vector<NucleotideRange> ranges;

    // Length of the current range
    int length = 1;

    auto n = safe_cast<int>(dels.size());
    for (int i = 1; i <= n; ++i) {
      if (i == n || dels[i].pos - dels[i - 1].pos != 1) {
        // If it's the end of the inputs, or if the current position is not adjacent to the previous,
        // then close the current range
        const auto begin = dels[i - length].pos;
        const auto end = dels[i - 1].pos + 1;
        const auto range = NucleotideRange{.begin = begin, .end = end, .length = length, .character = Nucleotide::GAP};
        ranges.emplace_back(range);

        // Start a new range
        length = 1;
      } else {
        // Extend the current range
        ++length;
      }
    }

    return ranges;
  }


}// namespace Nextclade
