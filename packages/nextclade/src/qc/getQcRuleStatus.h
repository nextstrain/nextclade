#pragma once

namespace Nextclade {
  enum class QcStatus : char;

  QcStatus getQcRuleStatus(double score);
}// namespace Nextclade
