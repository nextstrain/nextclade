#pragma once

#include <string>

// clang-format off
#include <nlohmann/json_fwd.hpp>
// clang-format on

namespace Nextclade {
  using json = nlohmann::ordered_json;
  std::string jsonStringify(const json& j, int spaces = 2);
}// namespace Nextclade
