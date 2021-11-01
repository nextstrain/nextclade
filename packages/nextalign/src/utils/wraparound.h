#pragma once

/**
 * Wraps given integer `x` (positive or negative) around `period`.
 * Negative values are wrapped backwards.
 *
 * Examples with period=3:
 *   6 --> 0
 *   5 --> 2
 *   4 --> 1
 *   3 --> 0
 *   2 --> 2
 *   1 --> 1
 *   0 --> 0
 *  -1 --> 2
 *  -2 --> 1
 *  -3 --> 0
 *  -4 --> 2
 *  -5 --> 1
 *  -6 --> 0
 */
inline int wraparound(int x, int period) {
  if (x < 0) {
    return ((x % period) + period) % period;
  }
  return x % period;
}
