#pragma once

#include <frozen/map.h>
#include <frozen/set.h>

#include <algorithm>
#include <map>
#include <optional>

/**
 * Convenience wrapper for std::map::find which returns std::optional
 */
template<typename K, typename V>
inline std::optional<V> mapFind(const std::map<K, V>& container, K key) {
  const auto found = container.find(key);
  if (found != container.end()) {
    return found->second;
  }
  return std::optional<V>{};
}

template<typename K, typename V, size_t N>
inline std::optional<V> mapFind(const frozen::map<K, V, N>& container, K key) {
  const auto found = container.find(key);
  if (found != container.end()) {
    return found->second;
  }
  return std::optional<V>{};
}


/**
 * Convenience wrapper for std::set::find which returns std::optional
 */
template<typename Set, typename T>
inline bool has(const Set& container, T key) {
  return container.find(key) != container.end();
}


template<typename Key, size_t N, typename Comp>
inline std::set<Key> intersection(const frozen::set<Key, N>& s1, const frozen::set<Key, N>& s2, Comp comp) {
  std::set<Key> intersection;
  std::set_intersection(s1.begin(), s1.end(), s2.begin(), s2.end(), std::inserter(intersection, intersection.begin()),
    comp);
  return intersection;
}

template<typename Key, size_t N, typename Comp>
inline bool have_intersection(const frozen::set<Key, N>& s1, const frozen::set<Key, N>& s2, Comp comp) {
  const auto in = intersection(s1, s2, comp);
  return in.size() > 0;
}


/**
 * Returns array of keys of std::map
 */
template<typename Key, typename Value>
std::vector<Key> keys(const std::map<Key, Value>& m) {
  std::vector<Key> result;
  std::transform(m.cbegin(), m.cend(), std::back_inserter(result), [](const auto& x) { return x.first; });
  return result;
}
