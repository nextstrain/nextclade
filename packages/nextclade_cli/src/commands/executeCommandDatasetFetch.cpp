#include <fmt/format.h>

#include "../generated/cli.h"
#include "commands.h"

namespace Nextclade {
  void executeCommandDatasetFetch(const std::shared_ptr<CliParamsDatasetFetch>& cliParams) {
    Logger logger{Logger::Options{
      .linePrefix = "Nextclade",
      .verbosity = Logger::convertVerbosity(cliParams->verbosity),
      .verbose = cliParams->verbose,
      .silent = cliParams->silent,
    }};

    fmt::print("callback: dataset fetch\n");
  }
}// namespace Nextclade
