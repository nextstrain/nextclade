#include "analyze.h"

#include <algorithm>
#include <boost/range/algorithm_ext/erase.hpp>
#include <vector>

#include "nucleotide.h"
#include "utils/safe_cast.h"


namespace Nextclade {
  auto reportInsertions(const NucleotideSequence& query, const NucleotideSequence& ref) {
    int refPos = 0;
    NucleotideSequence ins;
    int insStart = -1;
    std::vector<NucleotideInsertion> insertions;
    int i = 0;
    std::for_each(ref.begin(), ref.end(), [&refPos, &ins, &insStart, &insertions, &query, &i](Nucleotide d) {
      if (d == Nucleotide::GAP) {
        if (ins.empty()) {
          insStart = refPos;
        }
        ins += query[i];
      } else {
        if (!ins.empty()) {
          insertions.push_back(NucleotideInsertion{.pos = insStart, .length = safe_cast<int>(ins.size()), .ins = ins});
          ins = NucleotideSequence{};
        }
        refPos += 1;
      }
      ++i;
    });

    // add insertion at the end of the reference if it exists
    if (!ins.empty()) {
      insertions.push_back(NucleotideInsertion{.pos = insStart, .length = safe_cast<int>(ins.size()), .ins = ins});
    }

    return insertions;
  }


  auto stripQueryInsertionsRelativeToRef(const NucleotideSequence& query, const NucleotideSequence& ref) {
    int i = 0;
    auto refStrippedQuery = query;
    refStrippedQuery = boost::remove_erase_if(refStrippedQuery, [&i, &ref](Nucleotide c) {
      (void) c;
      const auto result = ref[i] == Nucleotide::GAP;
      ++i;
      return result;
    });

    return refStrippedQuery;
  }


  auto stripRefInsertions(const NucleotideSequence& ref) {
    auto refStripped = ref;
    refStripped = boost::remove_erase_if(refStripped, isGap);
    return refStripped;
  }

  auto reportMutations(const NucleotideSequence& refStripped, const NucleotideSequence& refStrippedQuery) {
    // report mutations
    int nDel = 0;
    int delPos = -1;
    bool beforeAlignment = true;
    std::vector<NucleotideSubstitution> substitutions;
    std::vector<NucleotideDeletion> deletions;
    int alignmentStart = -1;
    int alignmentEnd = -1;
    int i = 0;
    std::for_each(refStrippedQuery.begin(), refStrippedQuery.end(),
      [&beforeAlignment, &nDel, &delPos, &substitutions, &deletions, &alignmentEnd, &alignmentStart, &i, &refStripped](
        Nucleotide d) {
        if (d != Nucleotide::GAP) {
          if (beforeAlignment) {
            alignmentStart = i;
            beforeAlignment = false;
          } else if (nDel != 0) {
            deletions.push_back(NucleotideDeletion{.start = delPos, .length = nDel});
            nDel = 0;
          }
          alignmentEnd = i;
        }

        const auto& refNuc = refStripped[i];
        if (d != Nucleotide::GAP && d != refNuc && isAcgt(d)) {
          substitutions.push_back(NucleotideSubstitution{.pos = i, .refNuc = refNuc, .queryNuc = d});
        } else if (d == Nucleotide::GAP && !beforeAlignment) {
          if (nDel != 0) {
            delPos = i;
          }
          nDel++;
        }
      });

    return std::tuple(substitutions, deletions, alignmentStart, alignmentEnd);
  }


  AnalysisResult analyze(const NucleotideSequence& query, const NucleotideSequence& ref) {
    const auto insertions = reportInsertions(query, ref);

    const auto refStripped = stripRefInsertions(ref);
    const auto refStrippedQuery = stripQueryInsertionsRelativeToRef(query, ref);
    const auto [substitutions, deletions, alignmentStart, alignmentEnd] =
      reportMutations(refStripped, refStrippedQuery);

    return {//
      .substitutions = substitutions,
      .deletions = deletions,
      .insertions = insertions,
      .alignmentStart = alignmentStart,
      .alignmentEnd = alignmentEnd};
  }
}// namespace Nextclade
