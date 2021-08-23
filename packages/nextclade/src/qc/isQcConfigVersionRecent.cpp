#include "isQcConfigVersionRecent.h"

#include <nextclade/nextclade.h>

#include <semver.hpp>

namespace Nextclade {
  bool isQcConfigVersionRecent(const QcConfig& qcConfig) {
    const auto schemaVersion = semver::version{qcConfig.schemaVersion};
    return schemaVersion >= semver::version{Nextclade::getQcConfigJsonSchemaVersion()};
  }
}// namespace Nextclade
