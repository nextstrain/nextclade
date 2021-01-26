#pragma once

#include <type_traits>

/**
 * Casts scoped enum element's value to it's underlying type
 *
 * Note: this defeats type system and the whole point of scoped enums.
 *   Use only for very precise performance optimizations.
 */
template<typename E>
constexpr auto to_underlying(E e) noexcept {
  return static_cast<std::underlying_type_t<E>>(e);
}
