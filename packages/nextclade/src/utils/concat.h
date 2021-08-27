#pragma once

#include <vector>

/**
 * Marge contents of two vectors. A new vector is created and all items are copied.
 */
template<typename T>
inline std::vector<T> merge(const std::vector<T>& one, const std::vector<T>& two) {
  std::vector<T> result;
  std::copy(one.begin(), one.end(), std::back_inserter(result));
  std::copy(two.begin(), two.end(), std::back_inserter(result));
  return result;
}
