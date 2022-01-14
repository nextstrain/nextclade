#pragma once
#include <fmt/format.h>
#include <nextclade_common/filesystem.h>

#include <string>


namespace Nextclade {
  class ErrorCliDatasetDirNotFound : public ErrorFatal {
  public:
    explicit ErrorCliDatasetDirNotFound(const std::string& pathStr)
        : ErrorFatal(
            fmt::format("Dataset directory not found: \"{:s}\". Please verify correctness of the path.", pathStr)) {}
  };

  class ErrorCliDatasetFileNotFound : public ErrorFatal {
  public:
    explicit ErrorCliDatasetFileNotFound(const std::string& pathStr)
        : ErrorFatal(fmt::format("Dataset file not found: \"{:s}\". Dataset is corrupted.", pathStr)) {}
  };

  class ErrorFileNotFound : public ErrorFatal {
  public:
    explicit ErrorFileNotFound(const std::string& pathStr)
        : ErrorFatal(fmt::format("File not found: \"{:s}\". Please verify correctness of input flags. If a dataset is "
                                 "used, check that the dataset is not corrupted.",
            pathStr)) {}
  };


  struct InputPaths {
    std::string inputFasta;
    std::string inputRootSeq;
    std::optional<std::string> inputGeneMap;
    std::string inputQcConfig;
    std::string inputVirusJson;
    std::string inputTree;
    std::optional<std::string> inputPcrPrimers;
  };


  std::string toAbsolutePathRequired(const std::string& pathStr) {
    if (pathStr.empty()) {
      throw ErrorFileNotFound(pathStr);
    }

    auto absolutePath = fs::absolute(pathStr).string();
    if (!fs::is_regular_file_or_symlink(pathStr)) {
      throw ErrorFileNotFound(pathStr);
    }

    return absolutePath;
  }

  std::optional<std::string> toAbsolutePathOptional(const std::string& pathStr) {
    if (pathStr.empty()) {
      return {};
    }
    return fs::absolute(pathStr).string();
  }

  std::string takeFilenameFromDatasetMaybe(const std::string& customFilename, const std::string& inputDataset,
    const std::string& datasetFilename) {
    std::string result = customFilename;
    if (result.empty()) {
      result = fs::absolute(fs::path{inputDataset} / datasetFilename).string();
      if (!fs::is_regular_file_or_symlink(result)) {
        throw ErrorCliDatasetFileNotFound(result);
      }
    }

    return result;
  }

  InputPaths getInputPaths(const std::shared_ptr<CliParamsRun>& cliParams, Logger& logger) {
    auto inputFasta = std::string{cliParams->inputFasta};
    auto inputRootSeq = std::string{cliParams->inputRootSeq};
    auto inputGeneMap = std::string{cliParams->inputGeneMap};
    auto inputQcConfig = std::string{cliParams->inputQcConfig};
    auto inputVirusJson = std::string{cliParams->inputVirusJson};
    auto inputTree = std::string{cliParams->inputTree};
    auto inputPcrPrimers = std::string{cliParams->inputPcrPrimers};

    if (cliParams->inputDataset.empty() && inputRootSeq.empty()) {
      throw ErrorFatal(
        "Either `--input-dataset` or `--input-root-sequence` is required. Cannot proceed without reference sequence.");
    }

    if (cliParams->inputDataset.empty() && inputTree.empty()) {
      throw ErrorFatal(
        "Either `--input-dataset` or `--input-tree` is required. Cannot proceed without reference tree.");
    }

    if (cliParams->inputDataset.empty() && inputQcConfig.empty()) {
      throw ErrorFatal(
        "Either `--input-dataset` or `--input-qc-config` is required. Cannot proceed without QC config.");
    }

    if (!cliParams->inputDataset.empty()) {
      auto inputDataset = std::string{cliParams->inputDataset};

      if (!inputRootSeq.empty() && !inputGeneMap.empty() && !inputQcConfig.empty() && !inputTree.empty() &&
          !inputPcrPrimers.empty()) {
        logger.warn(
          "The input dataset is specified as well as all of the individual input files. This results in every file in "
          "the dataset being overridden, and dataset effectively to be ignored. This is not an error, but might not be "
          "what was intended.");
      }

      inputDataset = fs::absolute(inputDataset);

      if (!fs::is_directory(inputDataset)) {
        throw ErrorCliDatasetDirNotFound(inputDataset);
      }

      inputRootSeq = takeFilenameFromDatasetMaybe(inputRootSeq, inputDataset, "reference.fasta");
      inputGeneMap = takeFilenameFromDatasetMaybe(inputGeneMap, inputDataset, "genemap.gff");
      inputQcConfig = takeFilenameFromDatasetMaybe(inputQcConfig, inputDataset, "qc.json");
      inputVirusJson = takeFilenameFromDatasetMaybe(inputVirusJson, inputDataset, "virus_properties.json");
      inputTree = takeFilenameFromDatasetMaybe(inputTree, inputDataset, "tree.json");
      inputPcrPrimers = takeFilenameFromDatasetMaybe(inputPcrPrimers, inputDataset, "primers.csv");
    }

    return InputPaths{
      .inputFasta = toAbsolutePathRequired(inputFasta),
      .inputRootSeq = toAbsolutePathRequired(inputRootSeq),
      .inputGeneMap = toAbsolutePathOptional(inputGeneMap),
      .inputQcConfig = toAbsolutePathRequired(inputQcConfig),
      .inputVirusJson = toAbsolutePathRequired(inputVirusJson),
      .inputTree = toAbsolutePathRequired(inputTree),
      .inputPcrPrimers = toAbsolutePathOptional(inputPcrPrimers),
    };
  }
}// namespace Nextclade
