#include "getQcRuleStatus.h"

#include <nextclade/nextclade.h>

namespace Nextclade {
  QcStatus getQcRuleStatus(double score) {
    auto status = QcStatus::good;
    if (score >= 30 && score < 100) {// NOLINT(cppcoreguidelines-avoid-magic-numbers)
      status = QcStatus::mediocre;
    } else if (score >= 100) {// NOLINT(cppcoreguidelines-avoid-magic-numbers)
      status = QcStatus::bad;
    }
    return status;
  }
}// namespace Nextclade
