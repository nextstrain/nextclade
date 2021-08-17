#pragma once

#include <vector>

/**
 * Appends contents of the `from` vector to the end of the `to` vector without copying.
 * The contents of the `from` vector is invalidated and is no longer safe to use.
 */
template<typename T>
inline void concat_move(std::vector<T>& from, std::vector<T>& to) {
  to.insert(to.end(), std::make_move_iterator(from.begin()), std::make_move_iterator(from.end()));
}
