#pragma once

#include <nextalign/nextalign.h>

#include <boost/algorithm/string.hpp>
#include <boost/range/algorithm_ext/erase.hpp>

#include "../alphabet/aminoacids.h"
#include "../alphabet/nucleotides.h"


template<typename Letter>
inline void removeGapsInPlace(Sequence<Letter>& seq) {
  seq.erase(std::remove(boost::begin(seq), boost::end(seq), Letter::GAP), boost::end(seq));
}

template<typename Letter>
inline Sequence<Letter> removeGaps(const Sequence<Letter>& seq) {
  return removeGaps(SequenceView<Letter>(seq));
}

template<typename Letter>
inline Sequence<Letter> removeGaps(const SequenceView<Letter>& seq) {
  auto copy = Sequence<Letter>(seq);
  removeGapsInPlace(copy);
  return copy;
}
