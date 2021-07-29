#pragma once

#include <nextclade/nextclade.h>

#include <string>

#include "getInputPaths.h"
#include "getOutputPaths.h"
#include "parseRefFastaFile.h"

namespace Nextclade {

  inline std::string formatInputPaths(const InputPaths &paths) {
    fmt::memory_buffer buf;
    fmt::format_to(buf, "\nInput files:\n");
    fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "Sequences (query)", paths.inputFasta);
    fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "Root (reference) sequence", paths.inputRootSeq);
    fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "Reference tree", paths.inputTree);
    fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "Quality control configuration", paths.inputQcConfig);
    fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "Gene map", paths.inputGeneMap.value_or("-"));
    fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "PCR primers", paths.inputPcrPrimers.value_or("-"));
    return fmt::to_string(buf);
  }

  inline std::string formatOutputPaths(const OutputPaths &paths) {
    fmt::memory_buffer buf;
    fmt::format_to(buf, "\nOutput files:\n");
    fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "Aligned sequences", paths.outputFasta.string());
    fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "Stripped insertions", paths.outputInsertions.string());
    fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", "Errors and warnings", paths.outputErrors.string());

    for (const auto &[geneName, outputGenePath] : paths.outputGenes) {
      fmt::memory_buffer bufGene;
      fmt::format_to(bufGene, "{:s} {:>10s}", "Translated genes", geneName);
      fmt::format_to(buf, "{:>30s}: \"{:<s}\"\n", fmt::to_string(bufGene), outputGenePath.string());
    }

    return fmt::to_string(buf);
  }

  inline std::string formatRef(const ReferenceSequenceData &refData, bool shouldWriteReference) {
    return fmt::format("\nReference sequence:\n  name: \"{:s}\"\n  Length: {:d}\n  Include: {:s}\n", refData.name,
      refData.length, shouldWriteReference ? "yes" : "no");
  }

  inline std::string formatGeneMap(const GeneMap &geneMap, const std::set<std::string> &genes) {
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

}// namespace Nextclade
