#include "../../src/analyze/getAminoacidChanges.h"

#include <gtest/gtest.h>
#include <nextclade/private/nextclade_private.h>

#include <exception>
#include <vector>

#include "../utils/safe_cast.h"


namespace {
  using Nextclade::AminoacidDeletion;
  using Nextclade::AminoacidSubstitution;
  using Nextclade::getAminoacidChanges;
  using Nextclade::Range;
}// namespace


TEST(GetAminoacidChanges, Finds_Aminoacid_Substitution) {
  // clang-format off
  //                                                                        30    33    36    39    42    45                60
  //                                                                        v     v     v     v     v     v                 v
  const auto ref =   toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTA" "CCA" "ACT" "CAA" "ACT" "GTT" "GAT" "TCA" "TCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  const auto query = toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "ATT" "CCA" "ACT" "CAA" "ACT" "GTT" "GAT" "TCA" "TCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  //                                                                        ^ ^
  //                                                              2 mutations at pos 30 and 32
  // clang-format on

  GeneMap geneMap = GeneMap{
    {
      "Hello",//
      Gene{
        .geneName = "Hello",
        .start = 30,
        .end = 60,
        .strand = "+",
        .frame = 0,
        .length = 30,
      },
    },
  };

  auto options = getDefaultOptions();
  options.alignment.minimalLength = 0;
  const auto alignment = nextalignInternal(query, ref, geneMap, options);

  const auto aaChanges = getAminoacidChanges(              //
    alignment.ref,                                         //
    alignment.query,                                       //
    alignment.refPeptides,                                 //
    alignment.queryPeptides,                               //
    Range{.begin = 0, .end = safe_cast<int>(query.size())},//
    geneMap                                                //
  );                                                       //

  const std::vector<AminoacidSubstitution> aaSubstitutionsExpected = {
    AminoacidSubstitution{
      .gene = "Hello",
      .refAA = Aminoacid::L,
      .codon = 0,
      .queryAA = Aminoacid::I,
      .codonNucRange = {.begin = 30, .end = 33},
      .refContext = toNucleotideSequence("GGACTACCA"),
      .queryContext = toNucleotideSequence("GGAATTCCA"),
      .contextNucRange = {.begin = 27, .end = 36},
    },
  };

  EXPECT_EQ(aaSubstitutionsExpected, aaChanges.aaSubstitutions);
  EXPECT_EQ(0, aaChanges.aaDeletions.size());
}


/** Tests deletion that is aligned to codon. All 3 nucleotides of the codon are deleted here. */
TEST(GetAminoacidChanges, Finds_Aminoacid_Deletion) {
  // clang-format off
  //                                                                        30    33    36    39    42    45                60
  //                                                                        v     v     v     v     v     v                 v
  const auto ref =   toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTA" "CCA" "ACT" "CAA" "ACT" "GTT" "GAT" "TCA" "TCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  const auto query = toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTA" "CCA" "ACT" "---" "ACT" "GTT" "GAT" "TCA" "TCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  //                                                                                          ^^^
  //                                                                       deletion of CAA at pos [39; 42)
  // clang-format on

  GeneMap geneMap = GeneMap{
    {
      "Hello",//
      Gene{
        .geneName = "Hello",
        .start = 30,
        .end = 60,
        .strand = "+",
        .frame = 0,
        .length = 30,
      },
    },
  };

  auto options = getDefaultOptions();
  options.alignment.minimalLength = 0;
  const auto alignment = nextalignInternal(query, ref, geneMap, options);

  const auto aaChanges = getAminoacidChanges(              //
    alignment.ref,                                         //
    alignment.query,                                       //
    alignment.refPeptides,                                 //
    alignment.queryPeptides,                               //
    Range{.begin = 0, .end = safe_cast<int>(query.size())},//
    geneMap                                                //
  );                                                       //

  const std::vector<AminoacidDeletion> aaDeletionsExpected = {
    AminoacidDeletion{
      .gene = "Hello",
      .refAA = Aminoacid::Q,
      .codon = 3,
      .codonNucRange = {.begin = 39, .end = 42},
      .refContext = toNucleotideSequence("ACTCAAACT"),
      .queryContext = toNucleotideSequence("ACT---ACT"),
      .contextNucRange = {.begin = 36, .end = 45},
    },
  };

  EXPECT_EQ(aaDeletionsExpected, aaChanges.aaDeletions);
  EXPECT_EQ(0, aaChanges.aaSubstitutions.size());
}


/**
 * Tests deletion that is not aligned to codons.
 * 2 codons are affected here.
 * 3 nucleotides are deleted: 1 at the end of a codon and 2 at the beginning of the next codon.
 **/
TEST(GetAminoacidChanges, Finds_Aminoacid_Deletions_In_Adjacent_Codons_Right) {
  // clang-format off
  //                                                                        30    33    36    39    42    45                60
  //                                                                        v     v     v     v     v     v                 v
  const auto ref =   toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTA" "CCA" "TTT" "CAA" "ACT" "GTT" "GATTCATCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  const auto query = toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTA" "CCA" "TT-" "--A" "ACT" "GTT" "GATTCATCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  //                                                                                      ^   ^^
  //                                                  deletion of `TCA` at pos [38; 41) that spans two codons (2 and 3)
  //
  // clang-format on

  GeneMap geneMap = GeneMap{
    {
      "Foo",//
      Gene{
        .geneName = "Foo",
        .start = 30,
        .end = 60,
        .strand = "+",
        .frame = 0,
        .length = 30,
      },
    },
  };

  auto options = getDefaultOptions();
  options.alignment.minimalLength = 0;
  const auto alignment = nextalignInternal(query, ref, geneMap, options);

  const auto aaChanges = getAminoacidChanges(              //
    alignment.ref,                                         //
    alignment.query,                                       //
    alignment.refPeptides,                                 //
    alignment.queryPeptides,                               //
    Range{.begin = 0, .end = safe_cast<int>(query.size())},//
    geneMap                                                //
  );                                                       //

  const std::vector<AminoacidSubstitution> aaSubstitutionsExpected = {
    AminoacidSubstitution{
      .gene = "Foo",
      .refAA = Aminoacid::Q,
      .codon = 3,
      .queryAA = Aminoacid::L,
      .codonNucRange = {.begin = 39, .end = 42},
      .refContext = toNucleotideSequence("TTTCAAACT"),
      .queryContext = toNucleotideSequence("TT---AACT"),
      .contextNucRange = {.begin = 36, .end = 45},
    },
  };

  const std::vector<AminoacidDeletion> aaDeletionsExpected = {
    AminoacidDeletion{
      .gene = "Foo",
      .refAA = Aminoacid::F,
      .codon = 2,
      .codonNucRange = {.begin = 36, .end = 39},
      .refContext = toNucleotideSequence("CCATTTCAA"),
      .queryContext = toNucleotideSequence("CCATT---A"),
      .contextNucRange = {.begin = 33, .end = 42},
    },
  };

  // Should detect aa substitution
  EXPECT_EQ(aaSubstitutionsExpected, aaChanges.aaSubstitutions);

  // Should detect aa deletion
  EXPECT_EQ(aaDeletionsExpected, aaChanges.aaDeletions);
}


/**
 * Tests deletion that is not aligned to codons.
 * 2 codons are affected here.
 * 3 nucleotides are deleted: 2 at the end of a codon and 1 at the beginning of the next codon.
 **/
TEST(GetAminoacidChanges, Finds_Aminoacid_Deletions_In_Adjacent_Codons_Left) {
  // clang-format off
  //                                                                        30    33    36    39    42    45                60
  //                                                                        v     v     v     v     v     v                 v
  const auto ref =   toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTA" "CCA" "TTT" "CAA" "ACT" "GTT" "GATTCATCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  const auto query = toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTA" "CCA" "T--" "-AA" "ACT" "GTT" "GATTCATCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  //                                                                                     ^^   ^
  //                                                  deletion of `TTC` at pos [37; 40) that spans two codons (2 and 3)
  //
  // clang-format on

  GeneMap geneMap = GeneMap{
    {
      "Foo",//
      Gene{
        .geneName = "Foo",
        .start = 30,
        .end = 60,
        .strand = "+",
        .frame = 0,
        .length = 30,
      },
    },
  };

  auto options = getDefaultOptions();
  options.alignment.minimalLength = 0;
  const auto alignment = nextalignInternal(query, ref, geneMap, options);

  const auto aaChanges = getAminoacidChanges(              //
    alignment.ref,                                         //
    alignment.query,                                       //
    alignment.refPeptides,                                 //
    alignment.queryPeptides,                               //
    Range{.begin = 0, .end = safe_cast<int>(query.size())},//
    geneMap                                                //
  );                                                       //

  const std::vector<AminoacidSubstitution> aaSubstitutionsExpected = {
    AminoacidSubstitution{
      .gene = "Foo",
      .refAA = Aminoacid::Q,
      .codon = 3,
      .queryAA = Aminoacid::STOP,
      .codonNucRange = {.begin = 39, .end = 42},
      .refContext = toNucleotideSequence("TTTCAAACT"),
      .queryContext = toNucleotideSequence("T---AAACT"),
      .contextNucRange = {.begin = 36, .end = 45},
    },
  };

  const std::vector<AminoacidDeletion> aaDeletionsExpected = {
    AminoacidDeletion{
      .gene = "Foo",
      .refAA = Aminoacid::F,
      .codon = 2,
      .codonNucRange = {.begin = 36, .end = 39},
      .refContext = toNucleotideSequence("CCATTTCAA"),
      .queryContext = toNucleotideSequence("CCAT---AA"),
      .contextNucRange = {.begin = 33, .end = 42},
    },
  };

  // Should detect aa substitution
  EXPECT_EQ(aaSubstitutionsExpected, aaChanges.aaSubstitutions);

  // Should detect aa deletion
  EXPECT_EQ(aaDeletionsExpected, aaChanges.aaDeletions);
}
