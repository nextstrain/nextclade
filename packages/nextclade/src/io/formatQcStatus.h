#pragma once


#include <nextclade/nextclade.h>

#include <string>

namespace Nextclade {
  std::string formatQcStatus(const QcStatus& status);

  std::string formatQcFlags(const QcResult& qc);
}//namespace Nextclade
