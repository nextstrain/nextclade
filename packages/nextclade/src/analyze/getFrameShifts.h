#pragma once

#include <string>
#include <common/safe_vector.h>

struct PeptideInternal;
struct FrameShiftResult;

namespace Nextclade {

  safe_vector<FrameShiftResult> flattenFrameShifts(const safe_vector<PeptideInternal>& queryPeptides);
}// namespace Nextclade
