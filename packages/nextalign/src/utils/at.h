#pragma once

#include "contract.h"
#include "safe_cast.h"

template<typename Container, typename Index>
inline const typename Container::value_type& at(const Container& container, Index index) {
  const auto i = safe_cast<typename Container::size_type>(index);
  invariant_greater_equal(i, 0);
  invariant_less(i, container.size());
  return container[i];
}
