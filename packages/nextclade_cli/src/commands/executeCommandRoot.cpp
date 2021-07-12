#include <fmt/format.h>

#include "../generated/cli.h"
#include "commands.h"

namespace Nextclade {
  void executeCommandRoot(const CliParamsRoot& cliParams) {
    Logger logger{Logger::Options{
      .linePrefix = "Nextclade",
      .verbosity = Logger::convertVerbosity(cliParams.verbosity),
      .verbose = cliParams.verbose,
      .silent = cliParams.silent,
    }};

    const std::string versionNextalign = NEXTALIGN_VERSION;

    if (cliParams.version) {
      const std::string versionShort = PROJECT_VERSION;
      fmt::print("{:s}\n", versionShort);
    } else if (cliParams.versionDetailed) {
      const std::string versionDetailed =
        fmt::format("nextclade {:s}\nbased on libnextclade {:s}\nbased on libnexalign {:s}", PROJECT_VERSION,
          Nextclade::getVersion(), NEXTALIGN_VERSION);
      fmt::print("{:s}\n", versionDetailed);
    }
  }
}// namespace Nextclade
