#include <fmt/format.h>
#include <nextclade_json/nextclade_json.h>

#include <nlohmann/json.hpp>

namespace Nextclade {

  const json& at(const json& j, const json_pointer& jptr) {
    if (!j.is_object()) {
      throw ErrorJsonKeyNotFound(jptr.to_string());
    }

    if (!j.contains(jptr)) {
      throw ErrorJsonKeyNotFound(jptr.to_string());
    }

    return j[jptr];
  }

  const json& at(const json& j, const std::string& key) {
    if (!j.is_object()) {
      throw ErrorJsonKeyNotFound(key);
    }

    if (!j.contains(key)) {
      throw ErrorJsonKeyNotFound(key);
    }

    return j[key];
  }

  std::optional<std::string> parseOptionalString(const json& j, const json_pointer& jptr) {
    if (!j.contains(jptr)) {
      return {};
    }

    const auto& val = at(j, jptr);
    if (val.is_string()) {
      return val;
    }

    if (val.is_null()) {
      return {};
    }

    throw ErrorJsonTypeInvalid(jptr.to_string(), "string", val.type_name());
  }


  std::optional<std::string> parseOptionalString(const json& j, const std::string& key) {
    if (!j.contains(key)) {
      return {};
    }

    const auto& val = at(j, key);
    if (val.is_string()) {
      return val;
    }

    if (val.is_null()) {
      return {};
    }

    throw ErrorJsonTypeInvalid(key, "string", val.type_name());
  }


  int parseInt(const json& j, const std::string& key) {
    const auto& val = at(j, key);
    if (!val.is_number_integer()) {
      auto typeName = std::string{val.type_name()};
      if (typeName == std::string{"number"}) {
        typeName = "floating-point number";
      }
      throw ErrorJsonTypeInvalid(key, "integer", typeName);
    }
    return val.get<int>();
  }

  double parseDouble(const json& j, const std::string& key) {
    const auto& val = at(j, key);
    if (!val.is_number()) {
      throw ErrorJsonTypeInvalid(key, "number", val.type_name());
    }
    return val.get<double>();
  }

}// namespace Nextclade
