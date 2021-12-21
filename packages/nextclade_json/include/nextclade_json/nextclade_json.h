#pragma once

#include <fmt/format.h>

#include <map>
#include <set>
#include <vector>

// clang-format off
#include <nlohmann/json.hpp>
// clang-format on

namespace Nextclade {
  using json = nlohmann::ordered_json;
  using json_pointer = json::json_pointer;

  class ErrorJsonTypeInvalid : public std::runtime_error {
  public:
    ErrorJsonTypeInvalid(const std::string& key, const std::string& typeExpected, const std::string& typeActual)
        : std::runtime_error(fmt::format("When parsing property \"{:s}\": Expected "
                                         "to find \"{:s}\", but found \"{:s}\"",
            key, typeExpected, typeActual)) {}
  };

  class ErrorJsonKeyNotFound : public std::runtime_error {
  public:
    explicit ErrorJsonKeyNotFound(const std::string& key)
        : std::runtime_error(fmt::format("Key not found: \"{:s}\"", key)) {}
  };


  const json& at(const json& j, const json_pointer& jptr);

  const json& at(const json& j, const std::string& key);

  std::optional<std::string> parseOptionalString(const json& j, const json_pointer& jptr);

  std::optional<std::string> parseOptionalString(const json& j, const std::string& key);

  int parseInt(const json& j, const std::string& key);

  double parseDouble(const json& j, const std::string& key);

  template<typename T>
  std::set<T> parseSet(const json& arr) {
    std::set<T> set;
    for (const auto& elem : arr) {
      set.emplace(elem);
    }
    return set;
  }

  template<typename T, typename Parser>
  std::vector<T> parseArray(const json& arr, const Parser& parser) {
    std::vector<T> vec;

    for (const auto& elem : arr) {
      vec.push_back(parser(elem));
    }
    return vec;
  }

  template<typename T, typename Parser>
  std::vector<T> parseArray(const json& obj, const std::string& key, const Parser& parser) {
    const auto& arr = at(obj, key);
    if (!arr.is_array()) {
      throw ErrorJsonTypeInvalid(key, "array", arr.type_name());
    }
    return parseArray<T>(arr, parser);
  }

  template<typename T, typename Parser>
  std::vector<T> parseArray(const json& obj, const json_pointer& jptr, const Parser& parser) {
    const auto& arr = at(obj, jptr);
    if (!arr.is_array()) {
      throw ErrorJsonTypeInvalid(jptr.to_string(), "array", arr.type_name());
    }
    return parseArray<T>(arr, parser);
  }

  template<typename Key, typename Val>
  std::map<Key, Val> parseMap(const json& parent, const std::string& parentKey) {
    const auto& obj = at(parent, parentKey);
    if (!obj.is_object()) {
      throw ErrorJsonTypeInvalid(parentKey, "object", parent.type_name());
    }

    std::map<Key, Val> result;
    for (const auto& [key, value] : obj.items()) {
      result[key] = value;
    }
    return result;
  }

  template<typename Key, typename Val, typename Parser>
  std::map<Key, Val> parseMap(const json& parent, const std::string& parentKey, const Parser& parser) {
    const auto& obj = at(parent, parentKey);
    if (!obj.is_object()) {
      throw ErrorJsonTypeInvalid(parentKey, "object", parent.type_name());
    }

    std::map<Key, Val> result;
    for (const auto& [key, value] : obj.items()) {
      result[key] = parser(value);
    }
    return result;
  }


  std::string jsonStringify(const json& j, int spaces = 2);
}// namespace Nextclade
