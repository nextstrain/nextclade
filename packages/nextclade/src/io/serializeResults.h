#pragma once

#include <nextclade/nextclade.h>

#include <nlohmann/json.hpp>

namespace Nextclade {

  using json = nlohmann::ordered_json;

  template<typename Container, typename Serializer>
  json serializeArray(const Container& container, Serializer serializer) {
    auto j = json::array();
    for (const auto& elem : container) {
      j.template emplace_back(serializer(elem));
    }
    return j;
  }

  json serializeStopCodon(const StopCodonLocation& stopCodon);

}// namespace Nextclade
