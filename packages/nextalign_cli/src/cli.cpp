#include <fmt/format.h>
#include <nextalign/nextalign.h>
#include <tbb/global_control.h>
#include <tbb/parallel_pipeline.h>

#include <boost/algorithm/string.hpp>
#include <boost/algorithm/string/join.hpp>
#include <boost/algorithm/string/split.hpp>
#include <cxxopts.hpp>
#include <fstream>

#include "filesystem.h"


struct CliParams {
  int jobs;
  std::string sequences;
  std::string reference;
  std::optional<std::string> genemap;
  std::optional<std::string> genes;
  std::optional<std::string> outputDir;
  std::optional<std::string> outputBasename;
  std::optional<std::string> outputFasta;
  std::optional<std::string> outputInsertions;
};

struct Paths {
  fs::path outputFasta;
  fs::path outputInsertions;
  std::map<std::string, fs::path> outputGenes;
};

template<typename Result>
Result getParamRequired(
  const cxxopts::Options &cxxOpts, const cxxopts::ParseResult &cxxOptsParsed, const std::string &name) {
  if (!cxxOptsParsed.count(name)) {
    fmt::print(stderr, "Error: argument `--{:s}` is required\n\n", name);
    fmt::print(stderr, "{:s}\n", cxxOpts.help());
    std::exit(1);
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

template<typename Result>
Result getParamRequiredDefaulted(const cxxopts::ParseResult &cxxOptsParsed, const std::string &name) {
  return cxxOptsParsed[name].as<Result>();
}


NextalignOptions validateOptions(const cxxopts::ParseResult &cxxOptsParsed) {
  NextalignOptions options = getDefaultOptions();

  // clang-format off
  options.alignment.minimalLength = getParamRequiredDefaulted<int>(cxxOptsParsed, "min-length");
  options.alignment.scoreGapExtend = getParamRequiredDefaulted<int>(cxxOptsParsed, "score-gap-extend");
  options.alignment.scoreGapOpen = getParamRequiredDefaulted<int>(cxxOptsParsed, "score-gap-open");
  options.alignment.scoreGapOpenInFrame = getParamRequiredDefaulted<int>(cxxOptsParsed, "score-gap-open-in-frame");
  options.alignment.scoreGapOpenOutOfFrame = getParamRequiredDefaulted<int>(cxxOptsParsed, "score-gap-open-out-of-frame");
  options.alignment.scoreMismatch = getParamRequiredDefaulted<int>(cxxOptsParsed, "score-mismatch");
  options.alignment.scoreMatch = getParamRequiredDefaulted<int>(cxxOptsParsed, "score-match");
  options.alignment.maxIndel = getParamRequiredDefaulted<int>(cxxOptsParsed, "max-indel");

  options.seedNuc.seedLength = getParamRequiredDefaulted<int>(cxxOptsParsed, "nuc-seed-length");
  options.seedNuc.minSeeds = getParamRequiredDefaulted<int>(cxxOptsParsed, "nuc-min-seeds");
  options.seedNuc.seedSpacing = getParamRequiredDefaulted<int>(cxxOptsParsed, "nuc-seed-spacing");
  options.seedNuc.mismatchesAllowed = getParamRequiredDefaulted<int>(cxxOptsParsed, "nuc-mismatches-allowed");

  options.seedAa.seedLength = getParamRequiredDefaulted<int>(cxxOptsParsed, "aa-seed-length");
  options.seedAa.minSeeds = getParamRequiredDefaulted<int>(cxxOptsParsed, "aa-min-seeds");
  options.seedAa.seedSpacing = getParamRequiredDefaulted<int>(cxxOptsParsed, "aa-seed-spacing");
  options.seedAa.mismatchesAllowed = getParamRequiredDefaulted<int>(cxxOptsParsed, "aa-mismatches-allowed");
  // clang-format on

  return options;
}


std::tuple<CliParams, NextalignOptions> parseCommandLine(
  int argc, char *argv[]) {// NOLINT(cppcoreguidelines-avoid-c-arrays)
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
      "j,jobs",
      "(optional) Number of CPU threads used by the algorithm. If not specified or non-positive, will use all available threads",
      cxxopts::value<int>()->default_value(std::to_string(0)),
      "JOBS"
    )

    (
      "i,sequences",
      "(required) Path to a FASTA file with input sequences",
      cxxopts::value<std::string>(),
      "SEQS"
    )

    (
      "r,reference",
       "(required) Path to a FASTA or plain text file containing reference sequence",
       cxxopts::value<std::string>(),
       "REF"
    )

    (
      "g,genes",
       "(optional) List of genes to translate. Requires `--genemap`. If not supplied or empty, translation won't run. Parameters `--genes` and `--genemap` should be either both specified or both omitted.",
       cxxopts::value<std::string>(),
       "GENES"
    )

    (
      "m,genemap",
       "(optional) Path to a GFF file containing custom gene map. Requires `--genes.` If not supplied, translation won't run. Parameters `--genes` and `--genemap` should be either both specified or both omitted.",
       cxxopts::value<std::string>(),
       "GENEMAP"
    )

    (
      "d,output-dir",
      "(optional) Write output files to this directory. The base filename can be set using --output-basename flag. The paths can be overridden on a per-file basis using --output-* flags. If the required directory tree does not exist, it will be created.",
      cxxopts::value<std::string>(),
      "OUTPUT"
    )

    (
      "n,output-basename",
      "(optional) Sets the base filename to use for output files. To be used together with --output-dir flag. By default uses the filename of the sequences file (provided with --sequences). The paths can be overridden on a per-file basis using --output-* flags.",
      cxxopts::value<std::string>(),
      "OUTPUT"
    )

    (
      "o,output-fasta",
      "(required) Path to output aligned sequences in FASTA format (overrides paths given with --output-dir and --output-basename). If the required directory tree does not exist, it will be created.",
      cxxopts::value<std::string>(),
      "OUTPUT"
    )

    (
      "I,output-insertions",
      "(optional) Path to output stripped insertions data in CSV format (overrides paths given with --output-dir and --output-basename). If the required directory tree does not exist, it will be created.",
      cxxopts::value<std::string>(),
      "OUTPUT_INSERTIONS"
    )

    (
      "min-length",
      "(optional) Minimum length of nucleotide sequence to consider for alignment. If a sequence is shorter than that, alignment will not be attempted and a warning will be emitted. Alignment of short sequence can be unreliable.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.minimalLength)),
      "MIN_LENGTH"
    )

    (
      "score-gap-extend",
      "(optional) Score that penalizes the extension of a gap. Should be 0 or negative.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.scoreGapExtend)),
      "SCORE_GAP_EXTEND"
    )

    (
      "score-gap-open",
      "(optional) Score that penalizes opening of a gap. Should be negative. A higher penalty will results in fewer gaps and more mismatches.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.scoreGapOpen)),
      "SCORE_GAP_OPEN"
    )

    (
      "score-gap-open-in-frame",
      "(optional) As `--score-gap-open`, but for opening gaps at the beginning of a codon. Should be less than `--score-gap-open` but greater than `--score-gap-open-out-of-frame`, to avoid gaps in genes, but favor gaps that align with codons.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.scoreGapOpenInFrame)),
      "SCORE_GAP_OPEN_IN_FRAME"
    )

    (
      "score-gap-open-out-of-frame",
      "(optional) As `--score-gap-open`, but for opening gaps at the beginning of a codon. Should be smaller than `--score-gap-out-of-frame` to favor gaps that align with codons.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.scoreGapOpenOutOfFrame)),
      "SCORE_GAP_OPEN_OUT_OF_FRAME"
    )

    (
      "score-mismatch",
      "(optional) Score for aligned nucleotides or amino acids that differ in state. Should be 0 or negative. Note that this is redundantly parameterized with `--score-match`.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.scoreMismatch)),
      "SCORE_MISMATCH"
    )

    (
      "score-match",
      "(optional) Score for aligned nucleotides or amino acids with matching state. Needs to be positive.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.scoreMatch)),
      "SCORE_MATCH"
    )

    (
      "max-indel",
      "(optional) Maximum length of insertions or deletions allowed to proceed with alignment. Alignments with long indels are slow to compute and require substantial memory in the current implementation. Sequences with longer indels will not be attempted and a warning will be emitted.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().alignment.maxIndel)),
      "MAX_INDEL"
    )

    (
      "nuc-seed-length",
      "(optional) Seed length for nucleotide alignment. Seeds should be long enough to be unique, but short enough to match with high probability.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedNuc.seedLength)),
      "NUC_SEED_LENGTH"
    )

    (
      "nuc-min-seeds",
      "(optional) Minimum number of seeds to search for during nucleotide alignment. Relevant for short sequences. In long sequences, the number of seeds is determined by `nuc-seed-spacing`.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedNuc.minSeeds)),
      "NUC_MIN_SEEDS"
    )

    (
      "nuc-seed-spacing",
      "(optional) Spacing between seeds during nucleotide alignment.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedNuc.seedSpacing)),
      "NUC_SEED_SPACING"
    )

    (
      "nuc-mismatches-allowed",
      "(optional) Maximum number of mismatching nucleotides allowed for a seed to be considered a match.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedNuc.mismatchesAllowed)),
      "NUC_MISMATCHES_ALLOWED"
    )

    (
      "aa-seed-length",
      "(optional) Seed length for aminoacid alignment.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedAa.seedLength)),
      "AA_SEED_LENGTH"
    )

    (
      "aa-min-seeds",
      "(optional) Minimum number of seeds to search for during aminoacid alignment.  Relevant for short sequences. In long sequences, the number of seeds is determined by `aa-seed-spacing`.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedAa.minSeeds)),
      "AA_MIN_SEEDS"
    )

    (
      "aa-seed-spacing",
      "(optional) Spacing between seeds during aminoacid alignment.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedAa.seedSpacing)),
      "AA_SEED_SPACING"
    )

    (
      "aa-mismatches-allowed",
      "(optional) Maximum number of mismatching aminoacids allowed for a seed to be considered a match.",
      cxxopts::value<int>()->default_value(std::to_string(getDefaultOptions().seedAa.mismatchesAllowed)),
      "AA_MISMATCHES_ALLOWED"
    )
  ;
  // clang-format on

  const auto cxxOptsParsed = cxxOpts.parse(argc, argv);

  if (cxxOptsParsed.count("help") > 0) {
    fmt::print(stdout, "{:s}\n", cxxOpts.help());
    std::exit(0);
  }

  if (cxxOptsParsed.count("version") > 0) {
    fmt::print(stdout, "{:s}\n", versionShort);
    std::exit(0);
  }

  if (cxxOptsParsed.count("version-detailed") > 0) {
    fmt::print(stdout, "{:s}\n", versionDetailed);
    std::exit(0);
  }

  CliParams cliParams;
  cliParams.jobs = getParamRequiredDefaulted<int>(cxxOptsParsed, "jobs");
  cliParams.sequences = getParamRequired<std::string>(cxxOpts, cxxOptsParsed, "sequences");
  cliParams.reference = getParamRequired<std::string>(cxxOpts, cxxOptsParsed, "reference");
  cliParams.genemap = getParamOptional<std::string>(cxxOptsParsed, "genemap");
  cliParams.genes = getParamOptional<std::string>(cxxOptsParsed, "genes");
  cliParams.outputDir = getParamOptional<std::string>(cxxOptsParsed, "output-dir");
  cliParams.outputBasename = getParamOptional<std::string>(cxxOptsParsed, "output-basename");
  cliParams.outputFasta = getParamOptional<std::string>(cxxOptsParsed, "output-fasta");
  cliParams.outputInsertions = getParamOptional<std::string>(cxxOptsParsed, "output-insertions");

  if (bool(cliParams.genes) != bool(cliParams.genemap)) {
    throw std::runtime_error("Parameters `--genes` and `--genemap` should be either both specified or both omitted.");
  }

  NextalignOptions options = validateOptions(cxxOptsParsed);

  return std::make_pair(cliParams, options);
}

AlgorithmInput parseRefFastaFile(const std::string &filename) {
  std::ifstream file(filename);
  if (!file.good()) {
    fmt::print(stderr, "Error: unable to read \"{:s}\"\n", filename);
    std::exit(1);
  }

  const auto refSeqs = parseSequences(file);
  if (refSeqs.size() != 1) {
    fmt::print(stderr, "Error: {:d} sequences found in reference sequence file, expected 1", refSeqs.size());
    std::exit(1);
  }

  return *(refSeqs.begin());
}

GeneMap parseGeneMapGffFile(const std::string &filename) {
  std::ifstream file(filename);
  if (!file.good()) {
    fmt::print(stderr, "Error: unable to read \"{:s}\"\n", filename);
    std::exit(1);
  }

  auto geneMap = parseGeneMapGff(file);
  if (geneMap.empty()) {
    fmt::print(stderr, "Error: gene map is empty");
    std::exit(1);
  }

  return geneMap;
}

std::set<std::string> parseGenes(const CliParams &cliParams, const GeneMap &geneMap) {
  std::set<std::string> genes;

  if (cliParams.genes && !(cliParams.genes->empty())) {
    boost::algorithm::split(genes, *(cliParams.genes), boost::is_any_of(","));
  }

  return genes;
}

void validateGenes(const std::set<std::string> &genes, const GeneMap &geneMap) {
  for (const auto &gene : genes) {
    const auto &it = geneMap.find(gene);
    if (it == geneMap.end()) {
      fmt::print(stderr, "Error: gene \"{}\" is not in gene map\n", gene);
      std::exit(1);
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

  fmt::print("OUT PATH: \"{:<s}\"\n", outDir.string());

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

  return {.outputFasta = outputFasta, .outputInsertions = outputInsertions, .outputGenes = outputGenes};
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

std::string formatRef(const std::string &refName, const std::string &ref) {
  return fmt::format("\nReference:\n  name: \"{:s}\"\n  length: {:d}\n", refName, ref.size());
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
    const auto selectedStr = selected ? "  yes" : " ";
    fmt::format_to(buf, "| {:8s} | {:16s} | {:8d} | {:8d} | {:8d} | {:8d} | {:8s} |\n", selectedStr, geneName,
      gene.start + 1, gene.end + 1, gene.length, gene.frame + 1, gene.strand);
  }
  fmt::format_to(buf, "{:s}\n", std::string(TABLE_WIDTH, '-'));
  return fmt::to_string(buf);
}

std::string formatInsertions(const std::vector<Insertion> &insertions) {
  std::vector<std::string> insertionStrings;
  for (const auto &insertion : insertions) {
    insertionStrings.emplace_back(fmt::format("{:d}:{:s}", insertion.begin, insertion.seq));
  }

  return boost::algorithm::join(insertionStrings, ";");
}

/**
 * Runs nextalign algorithm in a parallel pipeline
 */
void run(
  /* in  */ int parallelism,
  /* in  */ const CliParams &cliParams,
  /* inout */ std::unique_ptr<FastaStream> &inputFastaStream,
  /* in  */ const std::string &refStr,
  /* in  */ const GeneMap &geneMap,
  /* in  */ const NextalignOptions &options,
  /* out */ std::ostream &outputFastaStream,
  /* out */ std::ostream &outputInsertionsStream,
  /* out */ std::map<std::string, std::ofstream> &outputGeneStreams) {
  tbb::task_group_context context;

  const auto ref = toNucleotideSequence(refStr);

  /** Input filter is a serial input filter function, which accepts an input stream,
   * reads and parses the contents of it, and returns parsed sequences */
  const auto inputFilter = tbb::make_filter<void, AlgorithmInput>(tbb::filter_mode::serial_in_order,//
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

  // HACK: prevent ref genes from being written multiple times
  // TODO: hoist ref sequence transforms - process and write results only once, outside of main loop
  bool refGenesHaveBeenWritten = false;

  /** Output filter is a serial ordered filter function which accepts the results from transform filters,
   * one at a time, displays and writes them to output streams */
  const auto outputFilter = tbb::make_filter<AlgorithmOutput, void>(tbb::filter_mode::serial_in_order,//
    [&outputFastaStream, &outputInsertionsStream, &outputGeneStreams, &refGenesHaveBeenWritten](
      const AlgorithmOutput &output) {
      const auto index = output.index;
      const auto &seqName = output.seqName;

      const auto &error = output.error;
      if (error) {
        try {
          std::rethrow_exception(error);
        } catch (const std::exception &e) {
          fmt::print(stderr,
            "Error: in sequence \"{:s}\": {:s}. Note that this sequence will be excluded from results.\n", seqName,
            e.what());
          return;
        }
      }

      const auto &query = output.result.query;
      const auto &alignmentScore = output.result.alignmentScore;
      const auto &insertions = output.result.insertions;
      const auto &queryPeptides = output.result.queryPeptides;
      const auto &refPeptides = output.result.refPeptides;
      const auto &warnings = output.result.warnings;
      fmt::print(stdout, "| {:5d} | {:<40s} | {:>16d} | {:12d} | \n",//
        index, seqName, alignmentScore, insertions.size());

      for (const auto &warning : warnings) {
        fmt::print(stderr, "Warning: in sequence \"{:s}\": {:s}\n", seqName, warning);
      }

      outputFastaStream << fmt::format(">{:s}\n{:s}\n", seqName, query);

      outputInsertionsStream << fmt::format("\"{:s}\",\"{:s}\"\n", seqName, formatInsertions(insertions));

      // TODO: hoist ref sequence transforms - process and write results only once, outside of main loop
      if (!refGenesHaveBeenWritten) {
        for (const auto &peptide : refPeptides) {
          outputGeneStreams[peptide.name] << fmt::format(">{:s}\n{:s}\n", "Reference", peptide.seq);
        }
        refGenesHaveBeenWritten = true;
      }

      for (const auto &peptide : queryPeptides) {
        outputGeneStreams[peptide.name] << fmt::format(">{:s}\n{:s}\n", seqName, peptide.seq);
      }
    });

  try {
    tbb::parallel_pipeline(parallelism, inputFilter & transformFilters & outputFilter, context);
  } catch (const std::exception &e) {
    fmt::print(stderr, "Error: when running the pipeline: {:s}\n", e.what());
  }
}


int main(int argc, char *argv[]) {
  try {
    const auto [cliParams, options] = parseCommandLine(argc, argv);
    fmt::print(stdout, formatCliParams(cliParams));

    const auto refInput = parseRefFastaFile(cliParams.reference);
    const auto &refName = refInput.seqName;
    const auto &ref = refInput.seq;
    fmt::print(stdout, formatRef(refName, ref));

    GeneMap geneMap;
    std::set<std::string> genes;
    if (cliParams.genes && cliParams.genemap) {
      geneMap = parseGeneMapGffFile(*cliParams.genemap);
      genes = parseGenes(cliParams, geneMap);
      validateGenes(genes, geneMap);
      geneMap = filterGeneMap(genes, geneMap);
      fmt::print(stdout, formatGeneMap(geneMap, genes));
    }

    std::ifstream fastaFile(cliParams.sequences);
    auto fastaStream = makeFastaStream(fastaFile);
    if (!fastaFile.good()) {
      fmt::print(stderr, "Error: unable to read \"{:s}\"\n", cliParams.sequences);
      std::exit(1);
    }

    const auto paths = getPaths(cliParams, genes);
    fmt::print(stdout, formatPaths(paths));

    fs::create_directories(paths.outputFasta.parent_path());
    fs::create_directories(paths.outputInsertions.parent_path());


    std::ofstream outputFastaFile(paths.outputFasta);
    if (!outputFastaFile.good()) {
      fmt::print(stderr, "Error: unable to write \"{:s}\"\n", paths.outputFasta.string());
      std::exit(1);
    }


    std::ofstream outputInsertionsFile(paths.outputInsertions);
    if (!outputInsertionsFile.good()) {
      fmt::print(stderr, "Error: unable to write \"{:s}\"\n", paths.outputInsertions.string());
      std::exit(1);
    }
    outputInsertionsFile << "seqName,insertions\n";

    std::map<std::string, std::ofstream> outputGeneFiles;
    for (const auto &[geneName, outputGenePath] : paths.outputGenes) {
      const auto result = outputGeneFiles.emplace(
        std::piecewise_construct, std::forward_as_tuple(geneName), std::forward_as_tuple(outputGenePath));

      const auto &outputGeneFile = result.first->second;

      if (!outputGeneFile.good()) {
        fmt::print(stderr, "Error: unable to write \"{:s}\"\n", outputGenePath.string());
        std::exit(1);
      }
    }

    int parallelism = -1;
    if (cliParams.jobs > 0) {
      tbb::global_control globalControl{
        tbb::global_control::max_allowed_parallelism, static_cast<size_t>(cliParams.jobs)};
      parallelism = cliParams.jobs;
    }

    fmt::print("\nParallelism: {:d}\n", parallelism);

    constexpr const auto TABLE_WIDTH = 86;
    fmt::print(stdout, "\nSequences:\n");
    fmt::print(stdout, "{:s}\n", std::string(TABLE_WIDTH, '-'));
    fmt::print(stdout, "| {:5s} | {:40s} | {:16s} | {:12s} |\n", "Index", "Seq. name", "Align. score", "Insertions");
    fmt::print(stdout, "{:s}\n", std::string(TABLE_WIDTH, '-'));


    try {
      run(parallelism, cliParams, fastaStream, ref, geneMap, options, outputFastaFile, outputInsertionsFile,
        outputGeneFiles);
    } catch (const std::exception &e) {
      fmt::print(stdout, "Error: {:>16s} |\n", e.what());
    }

    fmt::print(stdout, "{:s}\n", std::string(TABLE_WIDTH, '-'));
  } catch (const cxxopts::OptionSpecException &e) {
    std::cerr << "Error: " << e.what() << std::endl;
    std::exit(1);
  } catch (const cxxopts::OptionParseException &e) {
    std::cerr << "Error: " << e.what() << std::endl;
    std::exit(1);
  } catch (const std::exception &e) {
    std::cerr << "Error: " << e.what() << std::endl;
    std::exit(1);
  }
}
