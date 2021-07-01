#pragma once

#include <io/jsonParse.h>
#include <nextalign/nextalign.h>

#include <functional>
#include <string>

namespace Nextclade {
  struct StopCodonLocation;
  StopCodonLocation parseStopCodonLocation(const json& j);
}// namespace Nextclade
