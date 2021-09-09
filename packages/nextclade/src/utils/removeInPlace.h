#pragma once

#include <nextclade/nextclade.h>

#include <algorithm>

template<typename Container, typename Predicate>
inline void removeInPlaceIf(Container& c, Predicate predicate) {
  c.erase(std::remove_if(std::begin(c), std::end(c), predicate), std::end(c));
}
