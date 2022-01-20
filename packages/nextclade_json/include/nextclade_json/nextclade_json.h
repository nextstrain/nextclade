#pragma once

#include <common/copy.h>
#include <common/safe_vector.h>
#include <fmt/format.h>

#include <map>
#include <set>

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

  inline safe_vector<std::string> parseArrayOfStrings(const json& arr) {
    safe_vector<std::string> vec;
    for (const auto& str : arr) {
      vec.push_back(str);
    }
    return vec;
  }

  template<typename T, typename Parser>
  safe_vector<T> parseArray(const json& arr, const Parser& parser) {
    safe_vector<T> vec;

    for (const auto& elem : arr) {
      vec.push_back(parser(elem));
    }
    return vec;
  }

  template<typename T, typename Parser>
  safe_vector<T> parseArray(const json& obj, const std::string& key, const Parser& parser) {
    const auto& arr = at(obj, key);
    if (!arr.is_array()) {
      throw ErrorJsonTypeInvalid(key, "array", arr.type_name());
    }
    return parseArray<T>(arr, parser);
  }

  template<typename T, typename Parser>
  safe_vector<T> parseArray(const json& obj, const json_pointer& jptr, const Parser& parser) {
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

  /** Reads JSON value into the output reference. Throws if the key is not found */
  template<typename T>
  void readValue(const json& j, const std::string& path, T& value) {
    if (j.contains(json::json_pointer{path})) {
      value = j.at(json::json_pointer{path}).template get<T>();
    } else {
      throw ErrorJsonKeyNotFound(path);
    }
  }

  /** Reads JSON value into the output reference or a default value if the key is not found */
  template<typename T>
  void readValue(const json& j, const std::string& path, T& value, const T& defaultValue) {
    if (j.contains(json::json_pointer{path})) {
      value = j.at(json::json_pointer{path}).template get<T>();
    } else {
      value = copy(defaultValue);
    }
  }

  /**
   * Reads JSON array of values into the output reference, applying the parser function to every value.
   * Throws if the key is not found.
   */
  template<typename T, typename Parser>
  void readArrayOrThrow(const json& j, const std::string& path, safe_vector<T>& value, Parser parser) {
    if (j.contains(json::json_pointer{path})) {
      value = parseArray<T>(j, json::json_pointer{path}, parser);
    } else {
      throw ErrorJsonKeyNotFound(path);
    }
  }

  /**
   * Reads JSON array of values into the output reference, applying the parser function to every value.
   * Reads an empty array if the key is not found.
   */
  template<typename T, typename Parser>
  void readArrayMaybe(const json& j, const std::string& path, safe_vector<T>& value, Parser parser) {
    if (j.contains(json::json_pointer{path})) {
      value = parseArray<T>(j, json::json_pointer{path}, parser);
    } else {
      value = safe_vector<T>{};
    }
  }

  template<typename T>
  void writeValue(json& j, const std::string& path, const T& value) {
    j[json::json_pointer{path}] = value;
  }

  template<typename T, typename Serializer>
  void writeArray(json& j, const std::string& path, const safe_vector<T>& value, Serializer serializer) {
    j[json::json_pointer{path}] = serializeArray(value, serializer);
  }

  std::string jsonStringify(const json& j, int spaces = 2);
}// namespace Nextclade
