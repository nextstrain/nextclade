#include <commands/commands.h>
#include <fmt/format.h>
#include <frozen/set.h>
#include <nextclade_common/datasets.h>

#include "io/Logger.h"
#include "io/parseGeneMapGffFile.h"

// Goes last
#include "description.h"
#include "generated/cli.h"
#include "malloc_conf.h"

using namespace Nextclade;

bool isRootArg(const std::string& s) {
  constexpr auto ROOT_ARGS = frozen::make_set<frozen::string>({
    "-h",
    "-v",
    "--help",
    "--version",
    "--version-detailed",
  });

  return ROOT_ARGS.find(frozen::string{s}) != ROOT_ARGS.end();
}

/**
 * HACK: Prepends "run" subcommand to the command line, to be able to use subcommands (`dataset fetch`,
 * `dataset list`) while preserving the user interface and not introducing breaking changes.
 *
 * Reason: There seem to be no way of stopping required flags of the root command to propagate to subcommands,
 * so for example `dataset fetch` subcommand will fail if `--input-fasta` is required in the root. We moved
 * `--input-fasta` to the "run" subcommand. However, in order to preserve the old interface we now need to fake the
 * "run" command when it's not there. Without it users would have to prepend "run" subcommand to all Nextclade
 * invocations in the existing scripts and pipelines. Might be dropped in the next major release.
 */
std::vector<char*> preprocessArgs(int argc, char** argv) {
  // Be careful with pointers and constness here!
  constexpr const char* RUN_COMMAND = "run";
  std::vector<char*> args{argv, argv + argc};
  if ((argc == 1) ||
      (argc > 1 && (boost::starts_with(argv[1], "-") && argv[1] != RUN_COMMAND && !isRootArg(argv[1])))) {
    args.insert(args.begin() + 1, const_cast<char*>(RUN_COMMAND));
  }
  return args;
}

int main(int argc, char* argv[]) {
  auto args = preprocessArgs(argc, argv);

  const CliCallbacks callbacks = {
    .runRoot = executeCommandRoot,
    .runNextclade = executeCommandRun,
    .datasetGet = executeCommandDatasetGet,
    .datasetList = executeCommandDatasetList,
  };

  const NextalignOptions options = getDefaultOptions();
  const auto defaults = CliParamsAll{
    .root = {},
    .run =
      {
        .jobs = {},
        .inOrder = {},
        .inputFasta = {},
        .inputDataset = {},
        .inputRootSeq = {},
        .inputTree = {},
        .inputQcConfig = {},
        .genes = {},
        .inputGeneMap = {},
        .inputPcrPrimers = {},
        .outputJson = {},
        .outputCsv = {},
        .outputTsv = {},
        .outputTree = {},
        .outputDir = {},
        .outputBasename = {},
        .includeReference = {},
        .outputFasta = {},
        .outputInsertions = {},
        .outputErrors = {},

        .minimalLength = options.alignment.minimalLength,
        .penaltyGapExtend = options.alignment.penaltyGapExtend,
        .penaltyGapOpen = options.alignment.penaltyGapOpen,
        .penaltyGapOpenInFrame = options.alignment.penaltyGapOpenInFrame,
        .penaltyGapOpenOutOfFrame = options.alignment.penaltyGapOpenOutOfFrame,
        .penaltyMismatch = options.alignment.penaltyMismatch,
        .scoreMatch = options.alignment.scoreMatch,
        .maxIndel = options.alignment.maxIndel,

        .nucSeedLength = options.seedNuc.seedLength,
        .nucMinSeeds = options.seedNuc.minSeeds,
        .nucSeedSpacing = options.seedNuc.seedSpacing,
        .nucMismatchesAllowed = options.seedNuc.mismatchesAllowed,

        .noTranslatePastStop = !options.translatePastStop,

        .verbosity = {},
        .verbose = {},
        .silent = {},

      },
    .get = {},
    .list = {},
  };

  Logger logger{Logger::Options{
    .linePrefix = "Nextclade",
    .verbosity = Logger::convertVerbosity("error"),
  }};


  try {
    return parseCommandLine(args.size(), args.data(), PROJECT_DESCRIPTION, callbacks, defaults);
  } catch (const std::exception& e) {
    logger.error(e.what());
    return 1;
  } catch (...) {
    logger.error("Unknown error. This is probably a bug. Please report it to developers.");
    return 1;
  }
}
