#include "analyzeSequence.h"

#include <algorithm>
#include <boost/algorithm/string.hpp>
#include <boost/range/algorithm_ext/erase.hpp>
#include <string>
#include <vector>

#include "isCannonicalNucleotide.h"


auto reportInsertions(const std::string& query, const std::string& ref) {
  int refPos = 0;
  std::string ins;
  int insStart = -1;
  std::vector<NucleotideInsertion> insertions;
  int i = 0;
  std::for_each(ref.begin(), ref.end(), [&refPos, &ins, &insStart, &insertions, &query, &i](char d) {
    if (d == '-') {
      if (ins.empty()) {
        insStart = refPos;
      }
      ins += query[i];
    } else {
      if (!ins.empty()) {
        insertions.push_back({.pos = insStart, .ins = ins});
        ins = "";
      }
      refPos += 1;
    }
    ++i;
  });

  // add insertion at the end of the reference if it exists
  if (!ins.empty()) {
    insertions.push_back({.pos = insStart, .ins = ins});
  }

  return insertions;
}


auto stripQueryInsertionsRelativeToRef(const std::string& query, const std::string& ref) {
  int i = 0;
  auto refStrippedQuery = query;
  refStrippedQuery = boost::remove_erase_if(refStrippedQuery, [&i, &ref](char c) {
    (void) c;
    const auto result = ref[i] == '-';
    ++i;
    return result;
  });

  return refStrippedQuery;
}


auto stripRefInsertions(const std::string& ref) {
  auto refStripped = ref;
  refStripped = boost::remove_erase_if(refStripped, boost::is_any_of("-"));
  return refStripped;
}

auto reportMutations(const std::string& refStripped, const std::string& refStrippedQuery) {
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
      char d) {
      if (d != '-') {
        if (beforeAlignment) {
          alignmentStart = i;
          beforeAlignment = false;
        } else if (nDel != 0) {
          deletions.push_back({.start = delPos, .length = nDel});
          nDel = 0;
        }
        alignmentEnd = i;
      }

      const char refNuc = refStripped[i];
      if (d != '-' && d != refNuc && isCanonicalNucleotide(d)) {
        substitutions.push_back({.pos = i, .refNuc = refNuc, .queryNuc = d});
      } else if (d == '-' && !beforeAlignment) {
        if (nDel != 0) {
          delPos = i;
        }
        nDel++;
      }
    });

  return std::tuple(substitutions, deletions, alignmentStart, alignmentEnd);
}


AnalyzeSeqResult analyzeSequence(const std::string& query, const std::string& ref) {
  const auto insertions = reportInsertions(query, ref);

  const auto refStripped = stripRefInsertions(ref);
  const auto refStrippedQuery = stripQueryInsertionsRelativeToRef(query, ref);
  const auto [substitutions, deletions, alignmentStart, alignmentEnd] = reportMutations(refStripped, refStrippedQuery);

  return {insertions, substitutions, deletions, alignmentStart, alignmentEnd};
}
