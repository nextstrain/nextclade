#include "../src/translate/extractGene.h"

#include <gtest/gtest.h>
#include <nextalign/nextalign.h>

#include <string_view>
#include <vector>

#include "../src/translate/mapCoordinates.h"


TEST(stripGeneInPlace, Strips_Gene) {
  // GAPs on the edges should be replaced wih Ns

  // clang-format off
  //                                                 6                             30
  //                                                 |  |  |  |  |  |  |  |  |  |  |
  const std::string query               = "------"  "------" "-TGAATGGCC--" "------" "------";
  const std::string expected            =           "NNNNNN" "NTGAATGGCCNN" "NNNNNN";
  // clang-format on                                 |  |  |  |  |  |  |  |  |  |  |

  auto querySeq = toNucleotideSequence(query);
  stripGeneInPlace(querySeq);
  EXPECT_EQ(expected, toString(querySeq));
}

TEST(stripGeneInPlace, Strips_Gene_With_Middle_Gaps) {
  // GAPs on the edges should be replaced wih Ns and gaps in the middle gene should be removed

  // clang-format off
  //                                                 6                             30
  //                                                 |  |  |  |  |  |  |  |  |  |  |
  const std::string query               = "------"  "------" "-TG--TG-CC--" "------" "------";
  const std::string expected            =           "NNNNNN" "NTG""TCCNN" "NNNNNN";
  // clang-format on                                 |  |  |  |  |  |  |  |  |  |  |

  auto querySeq = toNucleotideSequence(query);
  stripGeneInPlace(querySeq);
  EXPECT_EQ(expected, toString(querySeq));
}

TEST(extractGeneQuery, Extracts_Query_Gene) {
  // Gene should be correctly extracted and GAPs on the edges should be replaced wih Ns

  // clang-format off
  //                                                 6                             30
  //                                                 |  |  |  |  |  |  |  |  |  |  |  |
  const std::string ref                 = "ATGTGA"  "AAACCC" "ATGAATGGCCCG" "TTTGGG" "AAAAAA";
  const std::string query_aligned       = "------"  "------" "-TGAATGGCC--" "------" "------";
  const std::string expected_gene_query =           "NNNNNN" "NTGAATGGCCNN" "NNNNNN";
  // clang-format on                                 |  |  |  |  |  |  |  |  |  |  |

  const Gene gene = {
    .geneName = "Hello",
    .start = 6,
    .end = 30,
    .strand = "+",
    .frame = 0,
    .length = 24,
  };

  const auto coordMap = mapCoordinates(toNucleotideSequence(ref));
  const auto gene_query = extractGeneQuery(toNucleotideSequence(query_aligned), gene, coordMap);

  EXPECT_EQ(toString(gene_query), expected_gene_query);
}

TEST(extractGeneQuery, Extracts_Query_Gene_With_Middle_Gaps) {
  // Gene should be correctly extracted, GAPs on the edges should be replaced wih Ns,
  // and gaps in the middle gene should be removed

  // clang-format off
  //                                                 6                             30
  //                                                 |  |  |  |  |  |  |  |  |  |  |  |
  const std::string ref                 = "ATGTGA"  "AAACCC" "ATGAATGGCCCG" "TTTGGG" "AAAAAA";
  const std::string query_aligned       = "------"  "------" "-T---TGGCC--" "------" "------";
  const std::string expected_gene_query =           "NNNNNN" "NT" "TGGCCNN" "NNNNNN";
  // clang-format on                                 |  |  |  |  |  |  |  |  |  |  |

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

