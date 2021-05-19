#include <fmt/format.h>
#include <nextalign/nextalign.h>
#include <tbb/global_control.h>
#include <tbb/parallel_pipeline.h>

#include <boost/algorithm/string.hpp>
#include <boost/algorithm/string/join.hpp>
#include <boost/algorithm/string/split.hpp>
#include <cxxopts.hpp>
#include <fstream>

#include "Logger.h"
#include "description.h"
#include "filesystem.h"


struct CliParams {
  int jobs{};
  std::string verbosity;
  bool verbose{};
  bool silent{};
  bool inOrder{};
  std::string sequences;
  std::string reference;
  std::optional<std::string> genemap;
  std::optional<std::string> genes;
  std::optional<std::string> outputDir;
  std::optional<std::string> outputBasename;
  std::optional<std::string> outputFasta;
  std::optional<std::string> outputInsertions;
  bool writeReference{};
};

struct Paths {
  fs::path outputFasta;
  fs::path outputInsertions;
  std::map<std::string, fs::path> outputGenes;
};


class ErrorCliOptionInvalidValue : public std::runtime_error {
public:
  explicit ErrorCliOptionInvalidValue(const std::string &message) : std::runtime_error(message) {}
};

class ErrorIoUnableToWrite : public std::runtime_error {
public:
  explicit ErrorIoUnableToWrite(const std::string &message) : std::runtime_error(message) {}
};

template<typename Result>
Result getParamRequired(const cxxopts::ParseResult &cxxOptsParsed, const std::string &name) {
  if (!cxxOptsParsed.count(name)) {
    throw ErrorCliOptionInvalidValue(fmt::format("Error: argument `--{:s}` is required\n\n", name));
  }

  return cxxOptsParsed[name].as<Result>();
}

template<typename Result>
std::optional<Result> getParamOptional(const cxxopts::ParseResult &cxxOptsParsed, const std::string &name) {
  if (!cxxOptsParsed.count(name)) {
    return {};
  }

  return cxxOptsParsed[name].as<Result>();
}

template<typename ValueType>
ValueType noopValidator([[maybe_unused]] const std::string &name, ValueType value) {
  return value;
}

int ensureNonNegative(const std::string &name, int value) {
  if (value >= 0) {
    return value;
  }
  throw ErrorCliOptionInvalidValue(
    fmt::format("Error: argument `--{:s}` should be non-negative, but got {:d}", name, value));
}

int ensurePositive(const std::string &name, int value) {
  if (value > 0) {
    return value;
  }
  throw ErrorCliOptionInvalidValue(
    fmt::format("Error: argument `--{:s}` should be positive, but got {:d}", name, value));
}

template<typename Result>
Result getParamRequiredDefaulted(const cxxopts::ParseResult &cxxOptsParsed, const std::string &name,
  const std::function<Result(const std::string &, Result)> &validator = &noopValidator<Result>) {
  const auto &value = cxxOptsParsed[name].as<Result>();
  return validator(name, value);
}


NextalignOptions validateOptions(const cxxopts::ParseResult &cxxOptsParsed) {
  NextalignOptions options = getDefaultOptions();

  // clang-format off
  options.alignment.minimalLength = getParamRequiredDefaulted<int>(cxxOptsParsed, "min-length", ensureNonNegative);
  options.alignment.penaltyGapExtend = getParamRequiredDefaulted<int>(cxxOptsParsed, "penalty-gap-extend", ensureNonNegative);

  options.alignment.penaltyGapOpen = getParamRequiredDefaulted<int>(cxxOptsParsed, "penalty-gap-open", ensurePositive);
  options.alignment.penaltyGapOpenInFrame = getParamRequiredDefaulted<int>(cxxOptsParsed, "penalty-gap-open-in-frame", ensurePositive);
  options.alignment.penaltyGapOpenOutOfFrame = getParamRequiredDefaulted<int>(cxxOptsParsed, "penalty-gap-open-out-of-frame", ensurePositive);

  options.alignment.penaltyMismatch = getParamRequiredDefaulted<int>(cxxOptsParsed, "penalty-mismatch", ensurePositive);
  options.alignment.scoreMatch = getParamRequiredDefaulted<int>(cxxOptsParsed, "score-match", ensurePositive);
  options.alignment.maxIndel = getParamRequiredDefaulted<int>(cxxOptsParsed, "max-indel", ensureNonNegative);

  options.seedNuc.seedLength = getParamRequiredDefaulted<int>(cxxOptsParsed, "nuc-seed-length", ensurePositive);
  options.seedNuc.minSeeds = getParamRequiredDefaulted<int>(cxxOptsParsed, "nuc-min-seeds", ensurePositive);
  options.seedNuc.seedSpacing = getParamRequiredDefaulted<int>(cxxOptsParsed, "nuc-seed-spacing", ensureNonNegative);
  options.seedNuc.mismatchesAllowed = getParamRequiredDefaulted<int>(cxxOptsParsed, "nuc-mismatches-allowed", ensureNonNegative);

  options.seedAa.seedLength = getParamRequiredDefaulted<int>(cxxOptsParsed, "aa-seed-length", ensurePositive);
  options.seedAa.minSeeds = getParamRequiredDefaulted<int>(cxxOptsParsed, "aa-min-seeds", ensurePositive);
  options.seedAa.seedSpacing = getParamRequiredDefaulted<int>(cxxOptsParsed, "aa-seed-spacing", ensureNonNegative);
  options.seedAa.mismatchesAllowed = getParamRequiredDefaulted<int>(cxxOptsParsed, "aa-mismatches-allowed", ensureNonNegative);
  // clang-format on

  return options;
}


std::tuple<CliParams, cxxopts::Options, NextalignOptions> parseCommandLine(int argc,
  char *argv[]) {// NOLINT(cppcoreguidelines-avoid-c-arrays)
  const std::string versionShort = PROJECT_VERSION;
  const std::string versionDetailed =
    fmt::format("nextalign {:s}\nbased on libnextalign {:s}", PROJECT_VERSION, getVersion());

  cxxopts::Options cxxOpts("nextalign", fmt::format("{:s}\n\n{:s}\n", versionDetailed, PROJECT_DESCRIPTION));

  // clang-format off
  cxxOpts.add_options()
    (
      "h,help",
      "Show this help"
    )

    (
      "v,version",
      "Show version"
    )

    (
      "version-detailed",
      "Show detailed version"
    )

    (
      "verbosity",
      fmt::format("(optional, string) Set minimum verbosity level of console output."
        " Possible values are (from least verbose to most verbose): {}."
        " Default: 'warn' (only errors and warnings are shown).",
        Logger::getVerbosityLevels()),
      cxxopts::value<std::string>()->default_value(Logger::getVerbosityDefaultLevel()),
      "VERBOSITY"
    )

    (
      "verbose",
      "(optional, boolean) Increase verbosity of the console output. Same as --verbosity=info."
    )

    (
      "silent",
      "(optional, boolean) Disable console output entirely. --verbosity=silent."
    )

    (
      "j,jobs",
      "(optional, integer) Number of CPU threads used by the algorithm. If not specified or if a non-positive value specified, the algorithm will use all the available threads.",
      cxxopts::value<int>()->default_value(std::to_string(0)),
      "JOBS"
    )

    (
      "in-order",
      "Force parallel processing in-order. With this flag the program will wait for results from the previous sequences to be written to the output files before writing the results of the next sequences, preserving the same order as in the input file. Due to variable sequence processing times, this might introduce unnecessary waiting times, but ensures that the resulting sequences are written in the same order as they occur in the inputs (except for sequences which have errors). By default, without this flag, processing might happen out of order, which is faster, due to the elimination of waiting, but might also lead to results written out of order - the order of results is not specified and depends on thread scheduling and processing times of individual sequences. This option is only relevant when `--jobs` is greater than 1 or is omitted. Note: the sequences which trigger errors during processing will be omitted from outputs, regardless of this flag."
    )

    (
      "i,sequences",
      "(required, string) Path to a FASTA file with input sequences",
      cxxopts::value<std::string>(),
      "SEQS"
    )

    (
      "r,reference",
       "(required, string) Path to a FASTA or plain text file containing reference sequence",
       cxxopts::value<std::string>(),
       "REF"
    )

    (
      "g,genes",
       "(optional, string) List of genes to translate. Requires `--genemap`. If not supplied or empty, sequence will not be translated. If non-empty, should contain a coma-separated list of gene names. Parameters `--genes` and `--genemap` should be either both specified or both omitted.",
       cxxopts::value<std::string>(),
       "GENES"
    )

    (
      "m,genemap",
       "(optional, string) Path to a GFF file containing custom gene map. Requires `--genes.` If not supplied, sequence will not be translated. Parameters `--genes` and `--genemap` should be either both specified or both omitted.",
       cxxopts::value<std::string>(),
       "GENEMAP"
    )

    (
      "d,output-dir",
      "(optional, string) Write output files to this directory. The base filename can be set using `--output-basename` flag. The paths can be overridden on a per-file basis using `--output-*` flags. If the required directory tree does not exist, it will be created.",
      cxxopts::value<std::string>(),
      "OUTPUT_DIR"
    )

    (
      "n,output-basename",
      "(optional, string) Set the base filename to use for output files. To be used together with `--output-dir` flag. By default uses the filename of the sequences file (provided with `--sequences`). The paths can be overridden on a per-file basis using `--output-*` flags.",
      cxxopts::value<std::string>(),
      "OUTPUT_BASENAME"
    )

    (
      "include-reference",
      "(optional, boolean) Whether to include aligned reference nucleotide sequence into output nucleotide sequence fasta file and reference peptides into output peptide files.",
      cxxopts::value<bool>(),
      "WRITE_REF"
    )

    (
      "o,output-fasta",
      "(optional, string) Path to output aligned sequences in FASTA format (overrides paths given with `--output-dir` and `--output-basename`). If the required directory tree does not exist, it will be created.",
      cxxopts::value<std::string>(),
      "OUTPUT_FASTA"
    )

    (
      "I,output-insertions",
      "(optional, string) Path to output stripped insertions data in CSV format (overrides paths given with `--output-dir` and `--output-basename`). If the required directory tree does not exist, it will be created.",
      cxxopts::value<std::string>(),
      "OUTPUT_INSERTIONS"
    )

    (
      "min-length",
      "(optional, integer, non-negative) Minimum length of nucleotide sequence to consider for alignment. If a sequence is shorter than that, alignment will not be attempted and a warning will be emitted. When adjusting this parameter, note that alignment of short sequences can be unreliable.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.minimalLength)),
      "MIN_LENGTH"
    )

    (
      "penalty-gap-extend",
      "(optional, integer, non-negative) Penalty for extending a gap. If zero, all gaps regardless of length incur the same penalty.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.penaltyGapExtend)),
      "PENALTY_GAP_EXTEND"
    )

    (
      "penalty-gap-open",
      "(optional, integer, positive) Penalty for opening of a gap. A higher penalty results in fewer gaps and more mismatches. Should be less than `--penalty-gap-open-in-frame` to avoid gaps in genes.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.penaltyGapOpen)),
      "PENALTY_GAP_OPEN"
    )

    (
      "penalty-gap-open-in-frame",
      "(optional, integer, positive) As `--penalty-gap-open`, but for opening gaps at the beginning of a codon. Should be greater than `--penalty-gap-open` and less than `--penalty-gap-open-out-of-frame`, to avoid gaps in genes, but favor gaps that align with codons.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.penaltyGapOpenInFrame)),
      "PENALTY_GAP_OPEN_IN_FRAME"
    )

    (
      "penalty-gap-open-out-of-frame",
      "(optional, integer, positive) As `--penalty-gap-open`, but for opening gaps in the body of a codon. Should be greater than `--penalty-gap-open-in-frame` to favor gaps that align with codons.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.penaltyGapOpenOutOfFrame)),
      "PENALTY_GAP_OPEN_OUT_OF_FRAME"
    )

    (
      "penalty-mismatch",
      "(optional, integer, positive) Penalty for aligned nucleotides or aminoacids that differ in state during alignment. Note that this is redundantly parameterized with `--score-match`.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.penaltyMismatch)),
      "PENALTY_MISMATCH"
    )

    (
      "score-match",
      "(optional, integer, positive) Score for encouraging aligned nucleotides or aminoacids with matching state.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.scoreMatch)),
      "SCORE_MATCH"
    )

    (
      "max-indel",
      "(optional, integer, non-negative) Maximum length of insertions or deletions allowed to proceed with alignment. Alignments with long indels are slow to compute and require substantial memory in the current implementation. Alignment of sequences with indels longer that this value, will not be attempted and a warning will be emitted.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.maxIndel)),
      "MAX_INDEL"
    )

    (
      "nuc-seed-length",
      "(optional, integer, positive) Seed length for nucleotide alignment. Seeds should be long enough to be unique, but short enough to match with high probability.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedNuc.seedLength)),
      "NUC_SEED_LENGTH"
    )

    (
      "nuc-min-seeds",
      "(optional, integer, positive) Minimum number of seeds to search for during nucleotide alignment. Relevant for short sequences. In long sequences, the number of seeds is determined by `--nuc-seed-spacing`. Should be a positive integer.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedNuc.minSeeds)),
      "NUC_MIN_SEEDS"
    )

    (
      "nuc-seed-spacing",
      "(optional, integer, non-negative) Spacing between seeds during nucleotide alignment.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedNuc.seedSpacing)),
      "NUC_SEED_SPACING"
    )

    (
      "nuc-mismatches-allowed",
      "(optional, integer, non-negative) Maximum number of mismatching nucleotides allowed for a seed to be considered a match.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedNuc.mismatchesAllowed)),
      "NUC_MISMATCHES_ALLOWED"
    )

    (
      "aa-seed-length",
      "(optional, integer, positive) Seed length for aminoacid alignment.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedAa.seedLength)),
      "AA_SEED_LENGTH"
    )

    (
      "aa-min-seeds",
      "(optional, integer, positive) Minimum number of seeds to search for during aminoacid alignment. Relevant for short sequences. In long sequences, the number of seeds is determined by `--aa-seed-spacing`.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedAa.minSeeds)),
      "AA_MIN_SEEDS"
    )

    (
      "aa-seed-spacing",
      "(optional, integer, non-negative) Spacing between seeds during aminoacid alignment.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedAa.seedSpacing)),
      "AA_SEED_SPACING"
    )

    (
      "aa-mismatches-allowed",
      "(optional, integer, non-negative) Maximum number of mismatching aminoacids allowed for a seed to be considered a match.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedAa.mismatchesAllowed)),
      "AA_MISMATCHES_ALLOWED"
    )
  ;
  // clang-format on

  try {
    const auto cxxOptsParsed = cxxOpts.parse(argc, argv);

    if (cxxOptsParsed.count("help") > 0) {
      fmt::print("{:s}\n", cxxOpts.help());
      std::exit(0);
    }

    if (cxxOptsParsed.count("version") > 0) {
      fmt::print("{:s}\n", versionShort);
      std::exit(0);
    }

    if (cxxOptsParsed.count("version-detailed") > 0) {
      fmt::print("{:s}\n", versionDetailed);
      std::exit(0);
    }

    CliParams cliParams;
    cliParams.jobs = getParamRequiredDefaulted<int>(cxxOptsParsed, "jobs");
    cliParams.inOrder = getParamRequiredDefaulted<bool>(cxxOptsParsed, "in-order");
    cliParams.verbosity = getParamRequiredDefaulted<std::string>(cxxOptsParsed, "verbosity");
    cliParams.verbose = getParamRequiredDefaulted<bool>(cxxOptsParsed, "verbose");
    cliParams.silent = getParamRequiredDefaulted<bool>(cxxOptsParsed, "silent");

    cliParams.sequences = getParamRequired<std::string>(cxxOptsParsed, "sequences");
    cliParams.reference = getParamRequired<std::string>(cxxOptsParsed, "reference");
    cliParams.genemap = getParamOptional<std::string>(cxxOptsParsed, "genemap");
    cliParams.genes = getParamOptional<std::string>(cxxOptsParsed, "genes");
    cliParams.outputDir = getParamOptional<std::string>(cxxOptsParsed, "output-dir");
    cliParams.outputBasename = getParamOptional<std::string>(cxxOptsParsed, "output-basename");
    cliParams.outputFasta = getParamOptional<std::string>(cxxOptsParsed, "output-fasta");
    cliParams.writeReference = getParamRequiredDefaulted<bool>(cxxOptsParsed, "include-reference");
    cliParams.outputInsertions = getParamOptional<std::string>(cxxOptsParsed, "output-insertions");

    if (bool(cliParams.genes) != bool(cliParams.genemap)) {
      throw ErrorCliOptionInvalidValue(
        "Parameters `--genes` and `--genemap` should be either both specified or both omitted.");
    }

    NextalignOptions options = validateOptions(cxxOptsParsed);

    return std::make_tuple(cliParams, cxxOpts, options);

  } catch (const cxxopts::OptionSpecException &e) {
    fmt::print(stderr, "Error: OptionSpecException: {:s}\n\n", e.what());
    fmt::print(stderr, "{:s}\n", cxxOpts.help());
    std::exit(1);
  } catch (const cxxopts::OptionParseException &e) {
    fmt::print(stderr, "Error: OptionParseException: {:s}\n\n", e.what());
    fmt::print(stderr, "{:s}\n", cxxOpts.help());
    std::exit(1);
  } catch (const ErrorCliOptionInvalidValue &e) {
    fmt::print(stderr, "Error: ErrorCliOptionInvalidValue: {:s}\n\n", e.what());
    fmt::print(stderr, "{:s}\n", cxxOpts.help());
    std::exit(1);
  } catch (const std::exception &e) {
    fmt::print(stderr, "Error: {:s}\n\n", e.what());
    fmt::print(stderr, "{:s}\n", cxxOpts.help());
    std::exit(1);
  }
}


class ErrorFastaReader : public std::runtime_error {
public:
  explicit ErrorFastaReader(const std::string &message) : std::runtime_error(message) {}
};

struct ReferenceSequenceData {
  const NucleotideSequence seq;
  const std::string name;
  const int length;
};

ReferenceSequenceData parseRefFastaFile(const std::string &filename) {
  std::ifstream file(filename);
  if (!file.good()) {
    throw ErrorFastaReader(fmt::format("Error: unable to read \"{:s}\"\n", filename));
  }

  const auto refSeqs = parseSequences(file, filename);
  if (refSeqs.size() != 1) {
    throw ErrorFastaReader(
      fmt::format("Error: {:d} sequences found in reference sequence file, expected 1", refSeqs.size()));
  }

  const auto &refSeq = refSeqs.front();
  const auto &seq = toNucleotideSequence(refSeq.seq);
  const auto length = static_cast<int>(seq.size());
  return {.seq = seq, .name = refSeq.seqName, .length = length};
}


class ErrorGffReader : public std::runtime_error {
public:
  explicit ErrorGffReader(const std::string &message) : std::runtime_error(message) {}
};

GeneMap parseGeneMapGffFile(const std::string &filename) {
  std::ifstream file(filename);
  if (!file.good()) {
    throw ErrorGffReader(fmt::format("Error: unable to read \"{:s}\"\n", filename));
  }

  auto geneMap = parseGeneMapGff(file, filename);
  if (geneMap.empty()) {
    throw ErrorGffReader(fmt::format("Error: gene map is empty"));
  }

  return geneMap;
}

std::set<std::string> parseGenes(const CliParams &cliParams) {
  std::set<std::string> genes;

  if (cliParams.genes && !(cliParams.genes->empty())) {
    boost::algorithm::split(genes, *(cliParams.genes), boost::is_any_of(","));
  }

  return genes;
}

class ErrorGeneMapValidationFailure : public std::runtime_error {
public:
  explicit ErrorGeneMapValidationFailure(const std::string &message) : std::runtime_error(message) {}
};

void validateGenes(const std::set<std::string> &genes, const GeneMap &geneMap) {
  for (const auto &gene : genes) {
    const auto &it = geneMap.find(gene);
    if (it == geneMap.end()) {
      throw ErrorGeneMapValidationFailure(fmt::format("Error: gene \"{}\" is not in gene map\n", gene));
    }
  }
}

GeneMap filterGeneMap(const std::set<std::string> &genes, const GeneMap &geneMap) {
  GeneMap result;
  for (const auto &gene : genes) {
    const auto &it = geneMap.find(gene);
    if (it != geneMap.end()) {
      result.insert(*it);
    }
  }
  return result;
}

std::string formatCliParams(const CliParams &cliParams) {
  fmt::memory_buffer buf;
  fmt::format_to(buf, "\nCLI Parameters:\n");
  fmt::format_to(buf, "{:>20s}=\"{:<d}\"\n", "--jobs", cliParams.jobs);
  fmt::format_to(buf, "{:>20s}=\"{:<s}\"\n", "--sequences", cliParams.sequences);
  fmt::format_to(buf, "{:>20s}=\"{:<s}\"\n", "--reference", cliParams.reference);

  if (cliParams.genes && cliParams.genemap) {
    fmt::format_to(buf, "{:>20s}=\"{:<s}\"\n", "--genes", *cliParams.genes);
    fmt::format_to(buf, "{:>20s}=\"{:<s}\"\n", "--genemap", *cliParams.genemap);
  }

  if (cliParams.outputDir) {
    fmt::format_to(buf, "{:>20s}=\"{:<s}\"\n", "--output-dir", *cliParams.outputDir);
  }

  if (cliParams.outputBasename) {
    fmt::format_to(buf, "{:>20s}=\"{:<s}\"\n", "--output-basename", *cliParams.outputBasename);
  }

  if (cliParams.outputFasta) {
    fmt::format_to(buf, "{:>20s}=\"{:<s}\"\n", "--output-fasta", *cliParams.outputFasta);
  }

  if (cliParams.outputInsertions) {
    fmt::format_to(buf, "{:>20s}=\"{:<s}\"\n", "--output-insertions", *cliParams.outputInsertions);
  }

  return fmt::to_string(buf);
}

Paths getPaths(const CliParams &cliParams, const std::set<std::string> &genes) {
  fs::path sequencesPath = cliParams.sequences;

  auto outDir = fs::canonical(fs::current_path());
  if (cliParams.outputDir) {
    outDir = *cliParams.outputDir;
  }

  if (!outDir.is_absolute()) {
    outDir = fs::current_path() / outDir;
  }

  auto baseName = sequencesPath.stem();
  if (cliParams.outputBasename) {
    baseName = *cliParams.outputBasename;
  }

  auto outputFasta = outDir / baseName;
  outputFasta += ".aligned.fasta";
  if (cliParams.outputFasta) {
    outputFasta = *cliParams.outputFasta;
  }

  auto outputInsertions = outDir / baseName;
  outputInsertions += ".insertions.csv";
  if (cliParams.outputInsertions) {
    outputInsertions = *cliParams.outputInsertions;
  }

  std::map<std::string, fs::path> outputGenes;
  for (const auto &gene : genes) {
    auto outputGene = outDir / baseName;
    outputGene += fmt::format(".gene.{:s}.fasta", gene);
    outputGenes.emplace(gene, outputGene);
  }

  return {
    .outputFasta = outputFasta,
    .outputInsertions = outputInsertions,
    .outputGenes = outputGenes,
  };
}

std::string formatPaths(const Paths &paths) {
  fmt::memory_buffer buf;
  fmt::format_to(buf, "\nOutput files:\n");
  fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "Aligned sequences", paths.outputFasta.string());
  fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "Stripped insertions", paths.outputInsertions.string());

  for (const auto &[geneName, outputGenePath] : paths.outputGenes) {
    fmt::memory_buffer bufGene;
    fmt::format_to(bufGene, "{:s} {:>10s}", "Translated genes", geneName);
    fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", fmt::to_string(bufGene), outputGenePath.string());
  }

  return fmt::to_string(buf);
}

std::string formatRef(const ReferenceSequenceData &refData, bool shouldWriteReference) {
  return fmt::format("\nReference:\n  name: \"{:s}\"\n  Length: {:d}\n  Write: {:s}", refData.name, refData.length,
    shouldWriteReference ? "yes" : "no");
}

std::string formatGeneMap(const GeneMap &geneMap, const std::set<std::string> &genes) {
  constexpr const auto TABLE_WIDTH = 86;

  fmt::memory_buffer buf;
  fmt::format_to(buf, "\nGene map:\n");
  fmt::format_to(buf, "{:s}\n", std::string(TABLE_WIDTH, '-'));
  fmt::format_to(buf, "| {:8s} | {:16s} | {:8s} | {:8s} | {:8s} | {:8s} | {:8s} |\n", "Selected", "   Gene Name",
    "  Start", "  End", " Length", "  Frame", " Strand");
  fmt::format_to(buf, "{:s}\n", std::string(TABLE_WIDTH, '-'));
  for (const auto &[geneName, gene] : geneMap) {
    const auto selected = std::find(genes.cbegin(), genes.cend(), geneName) != genes.cend();
    const std::string selectedStr = selected ? "  yes" : " ";
    fmt::format_to(buf, "| {:8s} | {:16s} | {:8d} | {:8d} | {:8d} | {:8d} | {:8s} |\n", selectedStr, geneName,
      gene.start + 1, gene.end, gene.length, gene.frame + 1, gene.strand);
  }
  fmt::format_to(buf, "{:s}\n", std::string(TABLE_WIDTH, '-'));
  return fmt::to_string(buf);
}

std::string formatInsertions(const std::vector<Insertion> &insertions) {
  std::vector<std::string> insertionStrings;
  insertionStrings.reserve(insertions.size());
  for (const auto &insertion : insertions) {
    insertionStrings.emplace_back(fmt::format("{:d}:{:s}", insertion.pos, insertion.ins));
  }

  return boost::algorithm::join(insertionStrings, ";");
}

/**
 * Runs nextalign algorithm in a parallel pipeline
 */
void run(
  /* in  */ int parallelism,
  /* in  */ bool inOrder,
  /* inout */ std::unique_ptr<FastaStream> &inputFastaStream,
  /* in  */ const ReferenceSequenceData &refData,
  /* in  */ const GeneMap &geneMap,
  /* in  */ const NextalignOptions &options,
  /* out */ std::ostream &outputFastaStream,
  /* out */ std::ostream &outputInsertionsStream,
  /* out */ std::map<std::string, std::ofstream> &outputGeneStreams,
  /* in */ bool shouldWriteReference,
  /* out */ Logger &logger) {
  tbb::task_group_context context;
  const auto ioFiltersMode = inOrder ? tbb::filter_mode::serial_in_order : tbb::filter_mode::serial_out_of_order;

  const auto &ref = refData.seq;
  const auto &refName = refData.name;

  /** Input filter is a serial input filter function, which accepts an input stream,
   * reads and parses the contents of it, and returns parsed sequences */
  const auto inputFilter = tbb::make_filter<void, AlgorithmInput>(ioFiltersMode,//
    [&inputFastaStream](tbb::flow_control &fc) -> AlgorithmInput {
      if (!inputFastaStream->good()) {
        fc.stop();
        return {};
      }

      return inputFastaStream->next();
    });


  /** A set of parallel transform filter functions, each accepts a parsed sequence from the input filter,
   * runs nextalign algorithm sequentially and returning its result.
   * The number of filters is determined by the `--jobs` CLI argument */
  const auto transformFilters = tbb::make_filter<AlgorithmInput, AlgorithmOutput>(tbb::filter_mode::parallel,//
    [&ref, &geneMap, &options](const AlgorithmInput &input) -> AlgorithmOutput {
      try {
        const auto query = toNucleotideSequence(input.seq);
        const auto result = nextalign(query, ref, geneMap, options);
        return {.index = input.index, .seqName = input.seqName, .hasError = false, .result = result, .error = nullptr};
      } catch (const std::exception &e) {
        const auto &error = std::current_exception();
        return {.index = input.index, .seqName = input.seqName, .hasError = true, .result = {}, .error = error};
      }
    });

  // HACK: prevent aligned ref and ref genes from being written multiple times
  // TODO: hoist ref sequence transforms - process and write results only once, outside of main loop
  bool refsHaveBeenWritten = !shouldWriteReference;

  /** Output filter is a serial ordered filter function which accepts the results from transform filters,
   * one at a time, displays and writes them to output streams */
  const auto outputFilter = tbb::make_filter<AlgorithmOutput, void>(ioFiltersMode,//
    [&refName, &outputFastaStream, &outputInsertionsStream, &outputGeneStreams, &refsHaveBeenWritten, &logger](
      const AlgorithmOutput &output) {
      const auto index = output.index;
      const auto &seqName = output.seqName;

      const auto &error = output.error;
      if (error) {
        try {
          std::rethrow_exception(error);
        } catch (const std::exception &e) {
          logger.warn("Warning: in sequence \"{:s}\": {:s}. Note that this sequence will be excluded from results.",
            seqName, e.what());
          return;
        }
      }

      const auto &refAligned = output.result.ref;
      const auto &queryAligned = output.result.query;
      const auto &alignmentScore = output.result.alignmentScore;
      const auto &insertions = output.result.insertions;
      const auto &queryPeptides = output.result.queryPeptides;
      const auto &refPeptides = output.result.refPeptides;
      const auto &warnings = output.result.warnings;
      logger.info("| {:5d} | {:<40s} | {:>16d} | {:12d} |",//
        index, seqName, alignmentScore, insertions.size());

      for (const auto &warning : warnings) {
        logger.warn("Warning: in sequence \"{:s}\": {:s}", seqName, warning);
      }

      // TODO: hoist ref sequence transforms - process and write results only once, outside of main loop
      if (!refsHaveBeenWritten && !error) {
        outputFastaStream << fmt::format(">{:s}\n{:s}\n", refName, refAligned);
        outputFastaStream.flush();

        for (const auto &peptide : refPeptides) {
          outputGeneStreams[peptide.name] << fmt::format(">{:s}\n{:s}\n", refName, peptide.seq);
          outputGeneStreams[peptide.name].flush();
        }

        refsHaveBeenWritten = true;
      }


      outputFastaStream << fmt::format(">{:s}\n{:s}\n", seqName, queryAligned);

      for (const auto &peptide : queryPeptides) {
        outputGeneStreams[peptide.name] << fmt::format(">{:s}\n{:s}\n", seqName, peptide.seq);
      }

      outputInsertionsStream << fmt::format("\"{:s}\",\"{:s}\"\n", seqName, formatInsertions(insertions));
    });

  try {
    tbb::parallel_pipeline(parallelism, inputFilter & transformFilters & outputFilter, context);
  } catch (const std::exception &e) {
    logger.error("Error: when running the internal parallel pipeline: {:s}", e.what());
  }
}

int main(int argc, char *argv[]) {
  Logger logger{Logger::Options{.linePrefix = "Nextalign", .verbosity = Logger::Verbosity::warn}};

  try {
    const auto [cliParams, cxxOpts, options] = parseCommandLine(argc, argv);
    const auto helpText = cxxOpts.help();

    auto verbosity = Logger::convertVerbosity(cliParams.verbosity);
    if (cliParams.verbose) {
      verbosity = Logger::Verbosity::info;
    }

    if (cliParams.silent) {
      verbosity = Logger::Verbosity::silent;
    }

    logger.setVerbosity(verbosity);
    logger.info(formatCliParams(cliParams));

    const auto refData = parseRefFastaFile(cliParams.reference);
    const auto shouldWriteReference = cliParams.writeReference;
    logger.info(formatRef(refData, shouldWriteReference));

    GeneMap geneMap;
    std::set<std::string> genes;
    if (cliParams.genes && cliParams.genemap) {
      geneMap = parseGeneMapGffFile(*cliParams.genemap);
      genes = parseGenes(cliParams);
      validateGenes(genes, geneMap);
      geneMap = filterGeneMap(genes, geneMap);
      logger.info(formatGeneMap(geneMap, genes));
    }

    if (!genes.empty()) {
      // penaltyGapOpenOutOfFrame > penaltyGapOpenInFrame > penaltyGapOpen
      const auto isInFrameGreater = options.alignment.penaltyGapOpenInFrame > options.alignment.penaltyGapOpen;
      const auto isOutOfFrameEvenGreater =
        options.alignment.penaltyGapOpenOutOfFrame > options.alignment.penaltyGapOpenInFrame;
      if (!(isInFrameGreater && isOutOfFrameEvenGreater)) {
        throw ErrorCliOptionInvalidValue(
          fmt::format("Should verify the condition `--penalty-gap-open-out-of-frame` > `--penalty-gap-open-in-frame` > "
                      "`--penalty-gap-open`, but got {:d} > {:d} > {:d}, which is false",
            options.alignment.penaltyGapOpenOutOfFrame, options.alignment.penaltyGapOpenInFrame,
            options.alignment.penaltyGapOpen));
      }
    }

    std::ifstream fastaFile(cliParams.sequences);
    auto fastaStream = makeFastaStream(fastaFile, cliParams.sequences);
    if (!fastaFile.good()) {
      logger.error("Error: unable to read \"{:s}\"", cliParams.sequences);
      std::exit(1);
    }

    const auto paths = getPaths(cliParams, genes);
    logger.info(formatPaths(paths));

    const auto outputFastaParent = paths.outputFasta.parent_path();
    if (!outputFastaParent.empty()) {
      fs::create_directories(outputFastaParent);
    }

    const auto outputInsertionsParent = paths.outputInsertions.parent_path();
    if (!outputInsertionsParent.empty()) {
      fs::create_directories(outputInsertionsParent);
    }

    std::ofstream outputFastaFile(paths.outputFasta);
    if (!outputFastaFile.good()) {
      throw ErrorIoUnableToWrite(fmt::format("Error: unable to write \"{:s}\"", paths.outputFasta.string()));
    }

    std::ofstream outputInsertionsFile(paths.outputInsertions);
    if (!outputInsertionsFile.good()) {
      throw ErrorIoUnableToWrite(fmt::format("Error: unable to write \"{:s}\"", paths.outputInsertions.string()));
    }
    outputInsertionsFile << "seqName,insertions\n";

    std::map<std::string, std::ofstream> outputGeneFiles;
    for (const auto &[geneName, outputGenePath] : paths.outputGenes) {
      const auto result = outputGeneFiles.emplace(std::piecewise_construct, std::forward_as_tuple(geneName),
        std::forward_as_tuple(outputGenePath));

      const auto &outputGeneFile = result.first->second;

      if (!outputGeneFile.good()) {
        throw ErrorIoUnableToWrite(fmt::format("Error: unable to write \"{:s}\"", outputGenePath.string()));
      }
    }

    auto parallelism = std::thread::hardware_concurrency();
    if (cliParams.jobs > 0) {
      tbb::global_control globalControl{tbb::global_control::max_allowed_parallelism,
        static_cast<size_t>(cliParams.jobs)};
      parallelism = cliParams.jobs;
    }

    bool inOrder = cliParams.inOrder;

    logger.info("\nParallelism: {:d}\n", parallelism);

    constexpr const auto TABLE_WIDTH = 86;
    logger.info("\nSequences:");
    logger.info("{:s}", std::string(TABLE_WIDTH, '-'));
    logger.info("| {:5s} | {:40s} | {:16s} | {:12s} |", "Index", "Seq. name", "Align. score", "Insertions");
    logger.info("{:s}", std::string(TABLE_WIDTH, '-'));

    try {
      run(parallelism, inOrder, fastaStream, refData, geneMap, options, outputFastaFile, outputInsertionsFile,
        outputGeneFiles, shouldWriteReference, logger);
    } catch (const std::exception &e) {
      logger.error("Error: {:>16s} |\n", e.what());
    }

    logger.info("{:s}", std::string(TABLE_WIDTH, '-'));
  } catch (const std::exception &e) {
    logger.error("Error: {:s}", e.what());
    std::exit(1);
  }
}
