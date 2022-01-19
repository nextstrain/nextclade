#include "findSubstitutionRanges.h"

namespace Nextclade {

  /**
   * Finds all contiguous ranges of nucleotide substitutions.
   */
  safe_vector<NucleotideRange> findSubstitutionRanges(const safe_vector<NucleotideSubstitutionSimple>& substitutions) {

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

}// namespace Nextclade
