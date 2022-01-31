#pragma once

#include <common/safe_vector.h>

/**
 * Appends contents of the `from` vector to the end of the `to` vector without copying.
 * The contents of the `from` vector is invalidated and is no longer safe to use.
 */
template<typename T>
inline void concat_move(safe_vector<T>& from, safe_vector<T>& to) {
  to.insert(to.end(), std::make_move_iterator(from.begin()), std::make_move_iterator(from.end()));
}
