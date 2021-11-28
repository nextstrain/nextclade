#include "rulePrivateMutations.h"

#include <nextclade/nextclade.h>

#include <algorithm>
#include <optional>
#include <type_traits>
#include <vector>

#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"

namespace Nextclade {

  /**
   * Finds all contiguous ranges of private nucleotide deletions.
   *
   * By contrast with nucleotide deletions (the `.deletions` field in the `AnalysisResult`), which are listed in the
   * form of ranges, private nucleotide deletions (the `.privateNucMutations.privateDeletions` field) are listed
   * individually. We compute the ranges for private deletions here.
   */
  std::vector<NucleotideRange> findPrivateDeletionRanges(
    const std::vector<NucleotideDeletionSimple>& privateDeletions) {

    // Sort deletions by position, so that later we can tell which ones are adjacent.
    // Note: it's a full sort, but we use `partial_sort_copy()` because there is no `sort_copy()`.
    std::vector<NucleotideDeletionSimple> privateDeletionsSorted;
    std::partial_sort_copy(                                                            //
      privateDeletions.cbegin(), privateDeletions.cend(),                              //
      privateDeletionsSorted.begin(), privateDeletionsSorted.end(),                    //
      [](const NucleotideDeletionSimple& left, const NucleotideDeletionSimple& right) {//
        return left.pos < right.pos;                                                   //
      });                                                                              //


    // This will be the result.
    std::vector<NucleotideRange> deletionRanges;

    // Remember the beginning of the current contiguous range. It's unset initially (std::nullopt)
    std::optional<int> begin;

    // Go over (sorted) deletions and see if the current deletion is adjacent to the previous one,
    // and group adjacent deletions into ranges.
    for (const auto& del : privateDeletionsSorted) {
      if (!begin) {
        // If there is no begin set previously, then this deletion starts the new range
        begin = del.pos;
      } else {

        if (*begin - del.pos != 1) {
          // This deletion is not adjacent to the previous. Terminate the range and remember it.
          // Note: we use ranges that are semi-open (on the right), hence the `+1` for the `end`.
          const auto end = del.pos + 1;
          const auto length = end - *begin;
          deletionRanges.emplace_back(
            NucleotideRange{.begin = *begin, .end = end, .length = length, .character = Nucleotide::GAP});

          // Unset the `begin`, to tell that there is no current range.
          // We use default constructor here instead of std::nullopt, because
          // there seem to be problems with using it on old Apple Clang.
          begin = std::optional<int>{};
        }

        // Otherwise (deletion is adjacent), extend the existing range (by simply not terminating it)
      }
    }

    // Terminate the last range if any (there is an open range if `begin` is set)
    if (!privateDeletionsSorted.empty() && begin) {
      const auto end = privateDeletionsSorted.back().pos;
      const auto length = end - *begin;
      deletionRanges.emplace_back(
        NucleotideRange{.begin = *begin, .end = end, .length = length, .character = Nucleotide::GAP});
    }

    return deletionRanges;
  }

  std::optional<QcResultPrivateMutations> rulePrivateMutations(//
    const AnalysisResult& result,                              //
    const QCRulesConfigPrivateMutations& config                //
  ) {
    if (!config.enabled) {
      return {};
    }

    // Note that we count *individual* nucleotide substitutions, but contiguous *ranges* of deletions.
    // That is, a 2 adjacent substitutions give a total of 2, but 2 adjacent deletions give a total of 1.

    const auto totalIndividualSubstitutions = safe_cast<int>(result.privateNucMutations.privateSubstitutions.size());

    const auto privateDeletionRanges = findPrivateDeletionRanges(result.privateNucMutations.privateDeletions);
    const auto totalContiguousDeletionRanges = safe_cast<int>(privateDeletionRanges.size());

    const auto totalPrivateMutations = safe_cast<double>(totalIndividualSubstitutions + totalContiguousDeletionRanges);

    // the score hits 100 if the excess mutations equals the cutoff value
    const auto score = (std::max(0.0, totalPrivateMutations - config.typical) * 100.0) / config.cutoff;
    const auto& status = getQcRuleStatus(score);

    return QcResultPrivateMutations{
      .score = score,
      .status = status,
      .total = totalPrivateMutations,
      .excess = totalPrivateMutations - config.typical,
      .cutoff = config.cutoff,
    };
  }
}// namespace Nextclade
