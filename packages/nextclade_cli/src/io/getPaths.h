#pragma once
#include <string>

#include "filesystem.h"

namespace Nextclade {
  struct Paths {
    fs::path outputFasta;
    fs::path outputInsertions;
    fs::path outputErrors;
    std::map<std::string, fs::path> outputGenes;
  };

  inline Paths getPaths(const CliParams &cliParams, const std::set<std::string> &genes) {
    fs::path sequencesPath = cliParams.inputFasta;

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

    auto outputErrors = outDir / baseName;
    outputErrors += ".errors.csv";
    if (cliParams.outputErrors) {
      outputErrors = *cliParams.outputErrors;
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
