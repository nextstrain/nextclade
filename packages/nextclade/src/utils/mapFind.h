#pragma once

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

/**
 * Convenience wrapper for std::map::find which returns std::optional
 */
template<typename T>
inline bool has(const std::set<T>& container, T key) {
  const auto found = container.find(key);
  return found != container.end();
}
