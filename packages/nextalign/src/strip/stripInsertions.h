#pragma once

#include <nextalign/nextalign.h>

#include <string>
#include <vector>

#include "../alphabet/nucleotides.h"
#include "../nextalign_private.h"
#include "../utils/contract.h"
#include "../utils/safe_cast.h"


template<typename Letter>
struct StripInsertionsResult {
  Sequence<Letter> queryStripped;
  std::vector<InsertionInternal<Letter>> insertions;
};


template<typename Letter>
inline StripInsertionsResult<Letter> stripInsertions(const Sequence<Letter>& ref, const Sequence<Letter>& query) {
  const int refLength = safe_cast<int>(ref.size());
  const int queryLength = safe_cast<int>(query.size());
  precondition_equal(refLength, queryLength);

  StripInsertionsResult<Letter> result;
  result.queryStripped.reserve(refLength);

  int insertionStart = -1;
  Sequence<Letter> currentInsertion;
  for (int i = 0; i < refLength; ++i) {
    const auto& c = ref[i];
    if (c == Letter::GAP) {
      if (currentInsertion.empty()) {
        currentInsertion = query[i];
        insertionStart = i;
      } else {
        currentInsertion += query[i];
      }
    } else {
      result.queryStripped += query[i];
      if (!currentInsertion.empty()) {
        const auto length = safe_cast<int>(currentInsertion.size());
        const auto end = insertionStart + length;

        result.insertions.emplace_back(
          InsertionInternal<Letter>{.begin = insertionStart, .end = end, .seq = currentInsertion});

        currentInsertion = Sequence<Letter>{};
        insertionStart = -1;
      }
    }
  }

  precondition_less_equal(result.queryStripped.size(), refLength);

  for (auto c : result.queryStripped) {
    precondition_less(c, Letter::SIZE);
  }

  return result;
}
