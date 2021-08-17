#include <nextclade/nextclade.h>

#include <nlohmann/json.hpp>
#include <string>

#include "jsonStringify.h"

namespace Nextclade {
  using json = nlohmann::ordered_json;

  json serializeGeneToJson(const Gene& gene) {
    auto j = json::object();
    j["geneName"] = gene.geneName;
    j["start"] = gene.start;
    j["end"] = gene.end;
    j["strand"] = gene.strand;
    j["frame"] = gene.frame;
    j["length"] = gene.length;
    return j;
  }

  std::string serializeGeneMap(const GeneMap& geneMap) {
    json j = json::array();
    for (const auto& [_0, gene] : geneMap) {
      j.emplace_back(serializeGeneToJson(gene));
    }
    return jsonStringify(j);
  }

}// namespace Nextclade
