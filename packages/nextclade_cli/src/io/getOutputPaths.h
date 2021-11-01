#pragma once
#include <fmt/format.h>
#include <nextclade_common/filesystem.h>

#include <string>

namespace Nextclade {
  struct OutputPaths {
    fs::path outputFasta;
    fs::path outputInsertions;
    fs::path outputErrors;
    std::map<std::string, fs::path> outputGenes;
  };

  inline OutputPaths getOutputPaths(const CliParamsRun &cliParams, const std::set<std::string> &genes) {
    fs::path sequencesPath = cliParams.inputFasta;

    auto outDir = fs::canonical(fs::current_path());
    if (!cliParams.outputDir.empty()) {
      outDir = cliParams.outputDir;
    }

    if (!outDir.is_absolute()) {
      outDir = fs::current_path() / outDir;
    }

    auto baseName = sequencesPath.stem();
    if (!cliParams.outputBasename.empty()) {
      baseName = cliParams.outputBasename;
    }

    auto outputFasta = outDir / baseName;
    outputFasta += ".aligned.fasta";
    if (!cliParams.outputFasta.empty()) {
      outputFasta = cliParams.outputFasta;
    }

    auto outputInsertions = outDir / baseName;
    outputInsertions += ".insertions.csv";
    if (!cliParams.outputInsertions.empty()) {
      outputInsertions = cliParams.outputInsertions;
    }

    auto outputErrors = outDir / baseName;
    outputErrors += ".errors.csv";
    if (!cliParams.outputErrors.empty()) {
      outputErrors = cliParams.outputErrors;
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
      .outputErrors = outputErrors,
      .outputGenes = outputGenes,
    };
  }
}// namespace Nextclade
