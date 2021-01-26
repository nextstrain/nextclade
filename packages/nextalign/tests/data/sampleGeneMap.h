#pragma once

#include <nextalign/nextalign.h>

#include <vector>

const std::vector<Gene> sampleGeneArray = {//
  Gene{
    .geneName = "E",
    .start = 26244,
    .end = 26472,
    .strand = "+",
    .frame = 1,
    .length = 228,
  },
  Gene{
    .geneName = "M",
    .start = 26522,
    .end = 27191,
    .strand = "+",
    .frame = 0,
    .length = 669,
  },
  Gene{
    .geneName = "N",
    .start = 28273,
    .end = 29533,
    .strand = "+",
    .frame = 2,
    .length = 1260,
  },
  Gene{
    .geneName = "ORF10",
    .start = 29557,
    .end = 29674,
    .strand = "+",
    .frame = 2,
    .length = 117,
  },
  Gene{
    .geneName = "ORF14",
    .start = 28733,
    .end = 28955,
    .strand = "+",
    .frame = 0,
    .length = 222,
  },
  Gene{
    .geneName = "ORF1a",
    .start = 265,
    .end = 13468,
    .strand = "+",
    .frame = 2,
    .length = 13203,
  },
  Gene{
    .geneName = "ORF1b",
    .start = 13467,
    .end = 21555,
    .strand = "+",
    .frame = 1,
    .length = 8088,
  },
  Gene{
    .geneName = "ORF3a",
    .start = 25392,
    .end = 26220,
    .strand = "+",
    .frame = 1,
    .length = 828,
  },
  Gene{
    .geneName = "ORF6",
    .start = 27201,
    .end = 27387,
    .strand = "+",
    .frame = 1,
    .length = 186,
  },
  Gene{
    .geneName = "ORF7a",
    .start = 27393,
    .end = 27759,
    .strand = "+",
    .frame = 1,
    .length = 366,
  },
  Gene{
    .geneName = "ORF7b",
    .start = 27755,
    .end = 27887,
    .strand = "+",
    .frame = 0,
    .length = 132,
  },
  Gene{
    .geneName = "ORF8",
    .start = 27893,
    .end = 28259,
    .strand = "+",
    .frame = 0,
    .length = 366,
  },
  Gene{
    .geneName = "ORF9b",
    .start = 28283,
    .end = 28577,
    .strand = "+",
    .frame = 0,
    .length = 294,
  },
  Gene{
    .geneName = "S",
    .start = 21562,
    .end = 25384,
    .strand = "+",
    .frame = 2,
    .length = 3822,
  }};


inline GeneMap makeGeneMap(const std::vector<Gene>& genes) {
  GeneMap geneMap;
  std::transform(genes.begin(), genes.end(), std::inserter(geneMap, geneMap.end()),
    [](const Gene& gene) { return std::make_pair(gene.geneName, gene); });
  return geneMap;
}

const GeneMap sampleGeneMap = makeGeneMap(sampleGeneArray);
