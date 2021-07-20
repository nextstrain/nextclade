#pragma once

#include <nextclade/nextclade.h>

#include <boost/algorithm/string.hpp>
#include <boost/algorithm/string/join.hpp>
#include <boost/algorithm/string/split.hpp>
#include <fstream>
#include <set>
#include <string>

namespace Nextclade {

  class ErrorGffReader : public ErrorFatal {
  public:
    inline explicit ErrorGffReader(const std::string &message) : ErrorFatal(message) {}
  };

  inline GeneMap parseGeneMapGffFile(const std::string &filename) {
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


  class ErrorGeneMapValidationFailure : public ErrorFatal {
  public:
    explicit ErrorGeneMapValidationFailure(const std::string &message) : ErrorFatal(message) {}
  };

  inline void validateGenes(const std::set<std::string> &genes, const GeneMap &geneMap) {
    for (const auto &gene : genes) {
      const auto &it = geneMap.find(gene);
      if (it == geneMap.end()) {
        throw ErrorGeneMapValidationFailure(fmt::format("Error: gene \"{}\" is not in gene map\n", gene));
      }
    }
  }

  inline GeneMap filterGeneMap(const std::set<std::string> &genes, const GeneMap &geneMap) {
    GeneMap result;
    for (const auto &gene : genes) {
      const auto &it = geneMap.find(gene);
      if (it != geneMap.end()) {
        result.insert(*it);
      }
    }
    return result;
  }


  inline std::set<std::string> parseGenes(const std::string &genesString) {
    std::vector<std::string> genes;

    if (!genesString.empty()) {
      boost::algorithm::split(genes, genesString, boost::is_any_of(","));
    }

    for (auto &gene : genes) {
      gene = boost::trim_copy(gene);
    }

    auto result = std::set<std::string>{genes.cbegin(), genes.cend()};
    return result;
  }
}// namespace Nextclade
