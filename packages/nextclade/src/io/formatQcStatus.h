#pragma once

#include <frozen/map.h>
#include <frozen/string.h>// NOLINT(modernize-deprecated-headers)
#include <nextclade/nextclade.h>

#include <string>

namespace Nextclade {
  constexpr auto qcStatusStrings = frozen::make_map<QcStatus, frozen::string>({
    {QcStatus::good, "good"},
    {QcStatus::mediocre, "mediocre"},
    {QcStatus::bad, "bad"},
  });

  constexpr auto qcStringsStatus = frozen::make_map<frozen::string, QcStatus>({
    {"good", QcStatus::good},
    {"mediocre", QcStatus::mediocre},
    {"bad", QcStatus::bad},
  });

  std::string formatQcStatus(const QcStatus& status);

  std::string formatQcFlags(const QcResult& qc);
}//namespace Nextclade
