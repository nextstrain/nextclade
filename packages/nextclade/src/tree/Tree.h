#pragma once

#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <nlohmann/json_fwd.hpp>

namespace Nextclade {
  using json = nlohmann::ordered_json;

  class ErrorAuspiceJsonV2TreeNotFound : public std::runtime_error {
  public:
    explicit ErrorAuspiceJsonV2TreeNotFound(const json& node);
  };
}// namespace Nextclade
