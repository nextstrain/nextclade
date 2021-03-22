#include <gtest/gtest.h>
#include <nextalign/nextalign.h>

#include <string_view>
#include <vector>

#include "../src/translate/extractGene.h"
#include "../src/translate/mapCoordinates.h"


TEST(extractGeneRef, ExtractsRefGene) {
  // clang-format off
  // gene                                    2          14
  // gene                                    |           |
  const std::string ref =                 "ACTCCGTGCGCTGCTG";
  // const std::string ref_aligned =      "ACTCCG---TGCGCTGCTG";
  // const std::string query_aligned =    "ACTGGTCTA---GCA";
  const std::string expected_gene_ref =     "TCCGTGCGCTGC";
  // const std::string expected_gene_query ="TGGTCTAGC";
  // clang-format on

  const Gene gene = {
    .geneName = "Hello",
    .start = 2,
    .end = 14,
    .strand = "+",
    .frame = 0,
    .length = 12,
  };

  const auto gene_ref = NucleotideSequence(extractGeneRef(toNucleotideSequence(ref), gene));

  EXPECT_EQ(toString(gene_ref), expected_gene_ref);
}


TEST(extractGeneQuery, ExtractsQueryGene) {
  // clang-format off
  // gene                                    2          14
  // gene                                    |           |
  const std::string ref =                 "ACTCCGTGCGCTGCTG";
  // const std::string ref_aligned =      "ACTCCG---TGCGCTGCTG";
  const std::string query_aligned =       "ACTGGTCTA---GCA";
  // const std::string expected_gene_ref =  "TCCGTGCGCTGC";
  const std::string expected_gene_query =   "TGGTCTAGC";
  // clang-format on

  const Gene gene = {
    .geneName = "Hello",
    .start = 2,
    .end = 14,
    .strand = "+",
    .frame = 0,
    .length = 12,
  };

  const auto coordMap = mapCoordinates(toNucleotideSequence(ref));
  const auto gene_query = extractGeneQuery(toNucleotideSequence(query_aligned), gene, coordMap);

  EXPECT_EQ(toString(gene_query), expected_gene_query);
}


TEST(extractGeneQuery, ExtractsQueryGeneCorrectlyStripped) {
  // clang-format off
  //                                                 6           18
  //                                                 |  |  |  |  |
  const std::string ref                 = "ATGTGA"  "ATGAATGGCCCG"  "AAAAAA";
  const std::string query_aligned       = "------"  "-TGAATGGCC--"  "------";
  const std::string expected_gene_query =           "NTGAATGGCCNN"          ;
  // clang-format on                                 |  |  |  |  |

  const Gene gene = {
    .geneName = "Hello",
    .start = 6,
    .end = 18,
    .strand = "+",
    .frame = 0,
    .length = 12,
  };

  const auto coordMap = mapCoordinates(toNucleotideSequence(ref));
  const auto gene_query = extractGeneQuery(toNucleotideSequence(query_aligned), gene, coordMap);

  EXPECT_EQ(toString(gene_query), expected_gene_query);
}

TEST(extractGeneQuery, ExtractsQueryGeneCorrectlyStrippedWithGaps) {
  // clang-format off
  //                                                 6           18
  //                                                 |  |  |  |  |
  const std::string ref                 = "ATGTGA"  "ATGAATGGCCCG"  "AAAAAA";
  const std::string query_aligned       = "------"  "-T---TGGCC--"  "------";
  const std::string expected_gene_query =           "NT" "TGGCCNN"          ;
  // clang-format on                                 |  |  |  |  |

  const Gene gene = {
    .geneName = "Hello",
    .start = 6,
    .end = 18,
    .strand = "+",
    .frame = 0,
    .length = 12,
  };

  const auto coordMap = mapCoordinates(toNucleotideSequence(ref));
  const auto gene_query = extractGeneQuery(toNucleotideSequence(query_aligned), gene, coordMap);

  EXPECT_EQ(toString(gene_query), expected_gene_query);
}

