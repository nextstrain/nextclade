#include <nextclade_json/nextclade_json.h>

#include <nlohmann/json.hpp>
#include <string>

namespace Nextclade {
  std::string jsonStringify(const json& j, int spaces) {
    constexpr auto indent_char = ' ';
    constexpr auto ensure_ascii = true;
    return j.dump(spaces, indent_char, ensure_ascii);
  }
}// namespace Nextclade
