#pragma once

#include <cstdint>
#include <cstdlib>

inline int32_t twos_compliment(float left) {
  int32_t l = *(reinterpret_cast<int32_t*>(&left));
  if (l < 0)
    l = 0x80000000 - l;
  return l;
}

inline int64_t twos_compliment(double left) {
  int64_t l = *(reinterpret_cast<int64_t*>(&left));
  if (l < 0)
    l = 0x8000000000000000 - l;
  return l;
}

template<typename T>
inline auto ulps_distance(const T& left, const T& right) {
  auto l = twos_compliment(left);
  auto r = twos_compliment(right);
  return l - r;
}

template<typename T>
inline bool almost_equal_impl(const T& left, const T& right, int ulps) {
  return std::abs(ulps_distance(left, right)) <= ulps;
}

inline bool almost_equal(float left, float right, int ulps) {
  return almost_equal_impl(left, right, ulps);
}

inline bool almost_equal(double left, double right, int ulps) {
  return almost_equal_impl(left, right, ulps);
}
