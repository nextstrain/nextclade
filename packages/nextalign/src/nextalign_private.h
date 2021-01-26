#pragma once

#include <nextalign/nextalign.h>

#include <gsl/string_span>

template<typename Letter>
using SequenceSpan = gsl::basic_string_span<Letter, gsl::dynamic_extent>;


template<typename Letter>
struct InsertionInternal {
  int begin;
  int end;
  Sequence<Letter> seq;
};

struct PeptideInternal {
  std::string name;
  AminoacidSequence seq;
  std::vector<InsertionInternal<Aminoacid>> insertions;
};
