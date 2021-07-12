#include <fmt/format.h>

#include "../generated/cli.h"
#include "commands.h"

namespace Nextclade {
  void executeCommandRun(const CliParamsRun& cliParams) {
    Logger logger{Logger::Options{
      .linePrefix = "Nextclade",
      .verbosity = Logger::convertVerbosity(cliParams.verbosity),
      .verbose = cliParams.verbose,
      .silent = cliParams.silent,
    }};

    fmt::print("callback: run\n");
  }
}// namespace Nextclade
