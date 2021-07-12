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

    fmt::print("callback: root\n");
    if (cliParams.version) {
      fmt::print("callback: root: version\n");
    } else if (cliParams.versionDetailed) {
      fmt::print("callback: root: versionDetailed\n");
    }
  }
}// namespace Nextclade
