#include "rulePrivateMutations.h"

#include <common/safe_vector.h>
#include <nextclade/nextclade.h>

#include <algorithm>
#include <optional>
#include <type_traits>

#include "../utils/safe_cast.h"
#include "getQcRuleStatus.h"
#include "utils/map.h"

namespace Nextclade {

  /**
   * Finds all contiguous ranges of private nucleotide deletions.
   *
   * By contrast with nucleotide deletions (the `.deletions` field in the `AnalysisResult`), which are listed in the
   * form of ranges, private nucleotide deletions are listed
   * individually. We compute the ranges for private deletions here.
   */
  safe_vector<NucleotideRange> findPrivateDeletionRanges(
    const safe_vector<NucleotideDeletionSimple>& privateDeletions) {

    // Sort deletions by position, so that later we can tell which ones are adjacent.
    // Note: it's a full sort, but we use `partial_sort_copy()` because there is no `sort_copy()`.
    safe_vector<NucleotideDeletionSimple> privateDeletionsSorted;
    std::partial_sort_copy(                                                            //
      privateDeletions.cbegin(), privateDeletions.cend(),                              //
      privateDeletionsSorted.begin(), privateDeletionsSorted.end(),                    //
      [](const NucleotideDeletionSimple& left, const NucleotideDeletionSimple& right) {//
        return left.pos < right.pos;                                                   //
      });                                                                              //


    // This will be the result.
    safe_vector<NucleotideRange> deletionRanges;

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

        // Otherwise, deletion is adjacent: extend the existing range (by simply not terminating it)
      }
    }

    // Terminate the last range if any (there is an open range if `begin` is set)
    if (!privateDeletionsSorted.empty() && begin) {
      const auto end = privateDeletionsSorted.back().pos;
      const auto length = end - *begin;
      if (length > 0) {
        deletionRanges.emplace_back(
          NucleotideRange{.begin = *begin, .end = end, .length = length, .character = Nucleotide::GAP});
      }
    }

    return deletionRanges;
  }


  /**
   * Finds all contiguous ranges of nucleotide substitutions.
   */
  safe_vector<NucleotideRange> findPrivateSubstitutionRanges(
    const safe_vector<NucleotideSubstitutionSimple>& substitutions) {

    // Sort substitutions by position, so that later we can tell which ones are adjacent.
    // Note: it's a full sort, but we use `partial_sort_copy()` because there is no `sort_copy()`.
    safe_vector<NucleotideSubstitutionSimple> substitutionsSorted;
    std::partial_sort_copy(                                                                    //
      substitutions.cbegin(), substitutions.cend(),                                            //
      substitutionsSorted.begin(), substitutionsSorted.end(),                                  //
      [](const NucleotideSubstitutionSimple& left, const NucleotideSubstitutionSimple& right) {//
        return left.pos < right.pos;                                                           //
      });                                                                                      //


    // This will be the result.
    safe_vector<NucleotideRange> ranges;

    // Remember the beginning of the current contiguous range. It's unset initially (std::nullopt)
    std::optional<int> begin;

    // Go over (sorted) substitutions and see if the current substitution is adjacent to the previous one,
    // and group adjacent substitutions into ranges.
    for (const auto& sub : substitutionsSorted) {
      if (!begin) {
        // If there is no begin set previously, then this substitution starts the new range
        begin = sub.pos;
      } else {

        if (*begin - sub.pos != 1) {
          // This substitution is not adjacent to the previous. Terminate the range and remember it.
          // Note: we use ranges that are semi-open (on the right), hence the `+1` for the `end`.
          const auto end = sub.pos + 1;
          const auto length = end - *begin;
          ranges.emplace_back(
            NucleotideRange{.begin = *begin, .end = end, .length = length, .character = Nucleotide::GAP});

          // Unset the `begin`, to tell that there is no current range.
          // We use default constructor here instead of std::nullopt, because
          // there seem to be problems with using it on old Apple Clang.
          begin = std::optional<int>{};
        }

        // Otherwise, substitution is adjacent: extend the existing range (by simply not terminating it)
      }
    }

    // Terminate the last range if any (there is an open range if `begin` is set)
    if (!substitutionsSorted.empty() && begin) {
      const auto end = substitutionsSorted.back().pos;
      const auto length = end - *begin;
      if (length > 0) {
        ranges.emplace_back(
          NucleotideRange{.begin = *begin, .end = end, .length = length, .character = Nucleotide::GAP});
      }
    }

    return ranges;
  }


  NucleotideDeletionSimple removeLabelsFromDel(const NucleotideDeletionSimpleLabeled& labeled) {
    return labeled.deletion;
  }

  safe_vector<NucleotideDeletionSimple> removeLabelsFromDels(
    const safe_vector<NucleotideDeletionSimpleLabeled>& labeled) {
    return map_vector<NucleotideDeletionSimpleLabeled, NucleotideDeletionSimple>(labeled, removeLabelsFromDel);
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

    const auto numReversionSubstitutions = safe_cast<int>(result.privateNucMutations.reversionSubstitutions.size());
    const auto numLabeledSubstitutions = safe_cast<int>(result.privateNucMutations.labeledSubstitutions.size());
    const auto numUnlabeledSubstitutions = safe_cast<int>(result.privateNucMutations.unlabeledSubstitutions.size());

    const auto reversionsOfDeletionsRanges =
      findPrivateSubstitutionRanges(result.privateNucMutations.reversionsOfDeletions);
    const auto numReversionsOfDeletions = safe_cast<int>(reversionsOfDeletionsRanges.size());

    const auto labeledDeletionRanges =
      findPrivateDeletionRanges(removeLabelsFromDels(result.privateNucMutations.labeledDeletions));
    const auto numLabeledDeletions = safe_cast<int>(labeledDeletionRanges.size());

    const auto unlabeledDeletionRanges = findPrivateDeletionRanges(result.privateNucMutations.unlabeledDeletions);
    const auto numUnlabeledDeletions = safe_cast<int>(unlabeledDeletionRanges.size());

    const auto weightedTotal =                                         //
      0.0                                                              //
      + config.weightReversionSubstitutions * numReversionSubstitutions//
      + config.weightReversionDeletions * numReversionsOfDeletions     //
      + config.weightLabeledSubstitutions * numLabeledSubstitutions    //
      + config.weightLabeledDeletions * numLabeledDeletions            //
      + config.weightUnlabeledSubstitutions * numUnlabeledSubstitutions//
      + config.weightUnlabeledDeletions * numUnlabeledDeletions        //
      ;

    // the score hits 100 if the excess mutations equals the cutoff value
    const auto score = (std::max(0.0, weightedTotal - config.typical) * 100.0) / config.cutoff;
    const auto& status = getQcRuleStatus(score);

    return QcResultPrivateMutations{
      .score = score,
      .status = status,
      .numReversionSubstitutions = numReversionSubstitutions,
      .numReversionsOfDeletions = numReversionsOfDeletions,
      .numLabeledSubstitutions = numLabeledSubstitutions,
      .numLabeledDeletions = numLabeledDeletions,
      .numUnlabeledSubstitutions = numUnlabeledSubstitutions,
      .numUnlabeledDeletions = numUnlabeledDeletions,
      .weightedTotal = weightedTotal,
      .excess = weightedTotal - config.typical,
      .cutoff = config.cutoff,
    };
  }
}// namespace Nextclade
