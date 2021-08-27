#pragma once

#include <nextalign/nextalign.h>
#include <nextclade_json/nextclade_json.h>

#include <functional>
#include <string>

namespace Nextclade {
  struct StopCodonLocation;
  StopCodonLocation parseStopCodonLocation(const json& j);
}// namespace Nextclade
