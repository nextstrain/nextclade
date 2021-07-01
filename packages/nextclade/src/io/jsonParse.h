#pragma once

#include <fmt/format.h>
#include <nextalign/nextalign.h>

#include <nlohmann/json.hpp>

using json = nlohmann::ordered_json;
using json_pointer = json::json_pointer;

class ErrorJsonTypeInvalid : public ErrorNonFatal {
public:
  ErrorJsonTypeInvalid(const std::string& key, const std::string& typeExpected, const std::string& typeActual)
      : ErrorNonFatal(fmt::format("When parsing property \"{:s}\": Expected "
                                  "to find \"{:s}\", but found \"{:s}\"",
          key, typeExpected, typeActual)) {}
};

class ErrorJsonKeyNotFound : public ErrorNonFatal {
public:
  explicit ErrorJsonKeyNotFound(const std::string& key) : ErrorNonFatal(fmt::format("Key not found: \"{:s}\"", key)) {}
};


const json& at(const json& j, const json_pointer& jptr);

const json& at(const json& j, const std::string& key);

std::optional<std::string> parseOptionalString(const json& j, const json_pointer& jptr);

std::optional<std::string> parseOptionalString(const json& j, const std::string& key);

int parseInt(const json& j, const std::string& key);

double parseDouble(const json& j, const std::string& key);

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
