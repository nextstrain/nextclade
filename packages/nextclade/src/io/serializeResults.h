#pragma once

#include <nextclade/nextclade.h>

#include <nlohmann/json.hpp>

namespace Nextclade {

  using json = nlohmann::ordered_json;

  template<typename Container, typename Serializer>
  inline json serializeArray(const Container& container, Serializer serializer) {
    auto j = json::array();
    for (const auto& elem : container) {
      j.template emplace_back(serializer(elem));
    }
    return j;
  }

  template<typename Container, typename Serializer>
  inline json serializeMap(const Container& container, Serializer serializer) {
    auto j = json::object();
    for (const auto& [key, val] : container) {
      j[key] = serializer(val);
    }
    return j;
  }


  json serializeFrameShiftLocation(const FrameShiftLocation& fs);
  json serializeStopCodon(const StopCodonLocation& stopCodon);

}// namespace Nextclade
