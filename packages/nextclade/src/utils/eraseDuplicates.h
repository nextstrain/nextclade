#pragma once

#include <algorithm>
#include <vector>

/**
 * Removes duplicates from the array.
 * Requires type T to have operators `<` and `==` defined.
 */
template<typename Container>
void eraseDuplicatesInPlace(Container& c) {
  std::sort(c.begin(), c.end());
  c.erase(std::unique(c.begin(), c.end()), c.end());
}


namespace details {

  /**
  * Gather duplicates in unsorted container in the end of the container.
  * Complexity: O(N**2)
  * Borrowed from https://stackoverflow.com/a/49863804
  */
  template<typename ForwardIterator>
  ForwardIterator remove_duplicates(ForwardIterator first, ForwardIterator last) {
    auto new_last = first;
    for (auto current = first; current != last; ++current) {
      if (std::find(first, new_last, *current) == new_last) {
        if (new_last != current) {
          *new_last = *current;
        }
        ++new_last;
      }
    }
    return new_last;
  }
}// namespace details

/**
 * Removes duplicates from unsorted container. O(N**2) complexity.
 */
template<typename T>
void eraseDuplicatesUnsortedInPlace(std::vector<T>& v) {
  v.erase(details::remove_duplicates(v.begin(), v.end()), v.end());
}
