#include <nextclade/nextclade.h>

#include <map>
#include <nlohmann/json.hpp>


namespace Nextclade {
  using json = nlohmann::ordered_json;
  using json_pointer = json::json_pointer;

  Gene parseGene(const json& j) {
    return Gene{
      .geneName = j["geneName"],
      .start = j["start"],
      .end = j["end"],
      .strand = j["strand"],
      .frame = j["frame"],
      .length = j["length"],
    };
  }

  GeneMap parseGeneMap(const std::string& geneMapStr) {
    const auto j = json::parse(geneMapStr);
    GeneMap geneMap;

    for (const auto& [_0, geneJson] : j.items()) {
      Gene gene = parseGene(geneJson);
      geneMap.emplace(gene.geneName, gene);
    }

    return geneMap;
  }

}// namespace Nextclade
