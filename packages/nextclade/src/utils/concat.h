#pragma once

#include <common/safe_vector.h>

/**
 * Marge contents of two vectors. A new vector is created and all items are copied.
 */
template<typename T>
inline safe_vector<T> merge(const safe_vector<T>& one, const safe_vector<T>& two) {
  safe_vector<T> result;
  std::copy(one.begin(), one.end(), std::back_inserter(result));
  std::copy(two.begin(), two.end(), std::back_inserter(result));
  return result;
}
