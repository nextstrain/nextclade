#include <fmt/format.h>

#include <cxxopts.hpp>

const int numCores = 4;


using CliOptions = cxxopts::ParseResult;

auto parseCommandLine(int argc, char *argv[]) {// NOLINT(cppcoreguidelines-avoid-c-arrays)
  cxxopts::Options options("nextclade", "Nextclade: Clade assignment, mutation calling, and sequence quality checks");

  // clang-format off
    options.add_options()
            ("h,help", "Show this help")
            ("j,jobs",
             "Number of CPU threads used by the algorithm. If not specified, using number of available logical CPU cores",
             cxxopts::value<int>()->default_value(std::to_string(numCores)),
             "JOBS"
            )
            ("i,input-fasta", "Path to a .fasta or a .txt file with input sequences", cxxopts::value<std::string>(),
             "IN_FASTA")
            ("r,input-root-seq", "(optional) Path to plain text file containing custom root sequence",
             cxxopts::value<std::string>(), "IN_ROOT_SEQ")
            ("a,input-tree",
             "(optional) Path to Auspice JSON v2 file containing custom reference tree. See https://nextstrain.org/docs/bioinformatics/data-formats",
             cxxopts::value<std::string>(),
             "IN_TREE"
            )
            ("q,input-qc-config",
             "(optional) Path to a JSON file containing custom configuration of Quality Control rules. For an example format see: https://github.com/nextstrain/nextclade/blob/20a9fda5b8046ce26669de2023770790c650daae/packages/web/src/algorithms/defaults/sars-cov-2/qcRulesConfig.ts",
             cxxopts::value<std::string>(),
             "IN_QC_CONF"
            )
            ("g,input-gene-map",
             R"((optional) Path to a JSON file containing custom gene map. Gene map (sometimes also called "gene annotations") is used to resolve aminoacid changes in genes. For an example see https://github.com/nextstrain/nextclade/blob/20a9fda5b8046ce26669de2023770790c650daae/packages/web/src/algorithms/defaults/sars-cov-2/geneMap.json)",
             cxxopts::value<std::string>(),
             "IN_GENE_MAP"
            )
            ("p,input-pcr-primers",
             "(optional) Path to a CSV file containing a list of custom PCR primer sites. These are used to report mutations in these sites. For an example see https://github.com/nextstrain/nextclade/blob/20a9fda5b8046ce26669de2023770790c650daae/packages/web/src/algorithms/defaults/sars-cov-2/pcrPrimers.csv",
             cxxopts::value<std::string>(),
             "IN_PCR_PRIMERS"
            )
            ("o,output-json",
             "(optional) Path to output JSON results file",
             cxxopts::value<std::string>(),
             "OUT_JSON"
            )
            ("c,output-csv",
             "(optional) Path to output CSV results file",
             cxxopts::value<std::string>(),
             "OUT_CSV"
            )
            ("t,output-tsv",
             "(optional) Path to output TSV results file",
             cxxopts::value<std::string>(),
             "OUT_TSV"
            )
            ("T,output-tree",
             "(optional) Path to output Auspice JSON V2 results file. See https://nextstrain.org/docs/bioinformatics/data-formats",
             cxxopts::value<std::string>(),
             "OUT_TREE"
            );
  // clang-format on


  auto result = options.parse(argc, argv);

  if (result.count("help") > 0) {
    std::cout << options.help() << std::endl;
    std::exit(0);
  }

  if (result.count("input-fasta") == 0) {
    std::cerr << "Error: input-fasta argument is required" << std::endl;
    std::cerr << options.help() << std::endl;
    std::exit(1);
  }

  if (result.count("output-json") == 0 && result.count("output-csv") == 0 && result.count("output-tsv") == 0 &&
      result.count("output-tree") == 0) {
    std::cerr << "Error: at least one of output path arguments required: --output-json, --output-csv, --output-tsv, "
                 "--output-tree"
              << std::endl;
    std::cerr << options.help() << std::endl;
    std::exit(1);
  }

  return result;
}

class DeveloperError : public std::runtime_error {
public:
  explicit DeveloperError(const std::string &message) : std::runtime_error(message) {}
};

template<typename Result>
auto getOptionRequired(const CliOptions &params, const std::string &name) -> Result {
  if (!params.count(name)) {
    throw DeveloperError(
      fmt::format("Developer Error: `--{:s}` argument is required but is not present. This may mean that "
                  "the missing required argument has escaped the argument validation. This needs to be fixed.",
        name));
  }

  return params[name].as<Result>();
}


template<typename Result>
auto getOption(const CliOptions &params, const std::string &name) -> std::optional<Result> {
  if (params.count(name)) {
    return params[name].as<Result>();
  }

  return std::optional<Result>();
}


struct Params {
  int numThreads;
  std::string inputFasta;
  std::optional<std::string> inputRootSeq;
  std::optional<std::string> inputTree;
  std::optional<std::string> inputQcConfig;
  std::optional<std::string> inputGeneMap;
  std::optional<std::string> inputPcrPrimers;
  std::optional<std::string> outputJson;
  std::optional<std::string> outputCsv;
  std::optional<std::string> outputTsv;
  std::optional<std::string> outputTree;
};

Params validateParams(const CliOptions &options) {
  const auto numThreads = getOptionRequired<int>(options, "jobs");
  const auto inputFasta = getOptionRequired<std::string>(options, "input-fasta");
  const auto inputRootSeq = getOption<std::string>(options, "input-root-seq");
  const auto inputTree = getOption<std::string>(options, "input-tree");
  const auto inputQcConfig = getOption<std::string>(options, "input-qc-config");
  const auto inputGeneMap = getOption<std::string>(options, "input-gene-map");
  const auto inputPcrPrimers = getOption<std::string>(options, "input-pcr-primers");
  const auto outputJson = getOption<std::string>(options, "output-json");
  const auto outputCsv = getOption<std::string>(options, "output-csv");
  const auto outputTsv = getOption<std::string>(options, "output-tsv");
  const auto outputTree = getOption<std::string>(options, "output-tree");

  return {numThreads, inputFasta, inputRootSeq, inputTree, inputQcConfig, inputGeneMap, inputPcrPrimers, outputJson,
    outputCsv, outputTsv, outputTree};
}


int main(int argc, char *argv[]) {
  try {
    const auto options = parseCommandLine(argc, argv);
    const auto params = validateParams(options);

    std::cout << params.numThreads << std::endl;
    std::cout << params.inputFasta << std::endl;

    if (params.outputTsv) {
      std::cout << *params.outputTsv << std::endl;
    }

  } catch (const cxxopts::OptionSpecException &e) {
    std::cerr << e.what() << std::endl;
  } catch (const cxxopts::OptionParseException &e) {
    std::cerr << e.what() << std::endl;
  } catch (const std::exception &e) {
    std::cerr << e.what() << std::endl;
    return 1;
  }
}
