#pragma once

#include <nextalign/nextalign.h>
#include <nextclade_json/nextclade_json.h>

#include <functional>
#include <string>

namespace Nextclade {
  struct FrameShiftLocation;
  struct StopCodonLocation;
  FrameShiftLocation parseFrameShiftLocation(const json& j);
  StopCodonLocation parseStopCodonLocation(const json& j);
}// namespace Nextclade
