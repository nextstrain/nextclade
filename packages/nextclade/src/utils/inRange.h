#pragma once

/**
 * Checks is a number x belongs to a half-open range [from; to)
 */
inline constexpr bool inRange(int x, int from, int to) {
  return x >= from && x < to;
}
