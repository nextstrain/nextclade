#include "../../src/analyze/getAminoacidChanges.h"

#include <fmt/format.h>
#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextalign/private/nextalign_private.h>

#include <exception>
#include <fstream>
#include <vector>

#include "../../../nextalign/include/nextalign/private/nextalign_private.h"
#include "../../include/nextclade/nextclade.h"
#include "../../include/nextclade/private/nextclade_private.h"
#include "../../src/analyze/analyze.h"
#include "../../src/io/parseMutation.h"


#define EXPECT_ARR_EQ_UNORDERED(expected, actual) ASSERT_THAT(actual, ::testing::UnorderedElementsAreArray(expected))

namespace {
  using Nextclade::AminoacidDeletion;
  using Nextclade::AminoacidSubstitution;
  using Nextclade::NucleotideDeletion;
  using Nextclade::NucleotideSubstitution;

  using Nextclade::analyze;
  using Nextclade::getAminoacidChanges;


}// namespace


TEST(GetAminoacidChanges, Finds_Aminoacid_Substitution) {
  // clang-format off
  //                                                                        30                            60
  //                                                                        v                             v
  const auto ref =   toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTACCAACTCAAACTGTTGATTCATCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  const auto query = toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "ATTCCAACTCAAACTGTTGATTCATCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
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
  auto analysis = analyze(alignment.query, alignment.ref);


  const auto aaChanges = getAminoacidChanges(//
    alignment.ref,                           //
    alignment.query,                         //
    alignment.refPeptides,                   //
    alignment.queryPeptides,                 //
    analysis.substitutions,                  //
    analysis.deletions,                      //
    geneMap                                  //
  );                                         //

  const std::vector<AminoacidSubstitution> aaSubstitutionsExpected = {
    AminoacidSubstitution{
      .refAA = Aminoacid::L,
      .queryAA = Aminoacid::I,
      .codon = 0,
      .gene = "Hello",
      .nucRange = {.begin = 30, .end = 33},
      .refCodon = toNucleotideSequence("CTA"),
      .queryCodon = toNucleotideSequence("ATT"),
    },
  };

  const std::vector<NucleotideSubstitution> nucSubstitutionsExpected = {
    NucleotideSubstitution{
      .refNuc = Nucleotide::C,
      .pos = 30,
      .queryNuc = Nucleotide::A,
      .aaSubstitutions = aaSubstitutionsExpected,
    },
    NucleotideSubstitution{
      .refNuc = Nucleotide::A,
      .pos = 32,
      .queryNuc = Nucleotide::T,
      .aaSubstitutions = aaSubstitutionsExpected,
    },
  };

  EXPECT_ARR_EQ_UNORDERED(aaSubstitutionsExpected, aaChanges.aaSubstitutions);

  // Should modify substitutions in-place!
  EXPECT_ARR_EQ_UNORDERED(nucSubstitutionsExpected, analysis.substitutions);
}


/** Tests deletion that is aligned to codon. All 3 nucleotides of the codon are deleted here. */
TEST(GetAminoacidChanges, FindsAminoacidDeletion) {
  // clang-format off
  //                                                                        30                            60
  //                                                                        v       gene "Hello"          v
  const auto ref =   toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTACCAACTCAAACTGTTGATTCATCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  const auto query = toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTACCAACT---ACTGTTGATTCATCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  //                                                                                 ^^^
  //                                                                 deletion of CCA at pos [39; 42)
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
  auto analysis = analyze(alignment.query, alignment.ref);


  const auto aaChanges = getAminoacidChanges(//
    alignment.ref,                           //
    alignment.query,                         //
    alignment.refPeptides,                   //
    alignment.queryPeptides,                 //
    analysis.substitutions,                  //
    analysis.deletions,                      //
    geneMap                                  //
  );                                         //

  const std::vector<AminoacidDeletion> aaDeletionsExpected = {
    AminoacidDeletion{
      .refAA = Aminoacid::Q,
      .codon = 3,
      .gene = "Hello",
      .nucRange = {.begin = 39, .end = 42},
      .refCodon = toNucleotideSequence("CAA"),
    },
  };

  const std::vector<NucleotideDeletion> nucDeletionsExpected = {
    NucleotideDeletion{
      .start = 39,
      .length = 3,
      .aaDeletions = aaDeletionsExpected,
    },
  };

  EXPECT_ARR_EQ_UNORDERED(aaDeletionsExpected, aaChanges.aaDeletions);

  // Should modify deletions in-place!
  EXPECT_ARR_EQ_UNORDERED(nucDeletionsExpected, analysis.deletions);
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
  auto analysis = analyze(alignment.query, alignment.ref);


  const auto aaChanges = getAminoacidChanges(//
    alignment.ref,                           //
    alignment.query,                         //
    alignment.refPeptides,                   //
    alignment.queryPeptides,                 //
    analysis.substitutions,                  //
    analysis.deletions,                      //
    geneMap                                  //
  );                                         //

  const std::vector<AminoacidDeletion> aaDeletionsExpected = {
    AminoacidDeletion{
      .refAA = Aminoacid::F,
      .codon = 2,
      .gene = "Foo",
      .nucRange = {.begin = 36, .end = 39},
      .refCodon = toNucleotideSequence("TTT"),
    },
  };

  const std::vector<AminoacidSubstitution> aaSubstitutionsExpected = {
    AminoacidSubstitution{
      .refAA = Aminoacid::Q,
      .queryAA = Aminoacid::L,
      .codon = 3,
      .gene = "Foo",
      .nucRange = {.begin = 39, .end = 42},
      .refCodon = toNucleotideSequence("CAA"),
      .queryCodon = toNucleotideSequence("TTA"),
    },
  };

  const std::vector<NucleotideDeletion> nucDeletionsExpected = {
    NucleotideDeletion{
      .start = 38,
      .length = 3,
      .aaSubstitutions = aaSubstitutionsExpected,
      .aaDeletions = aaDeletionsExpected,
    },
  };

  // Should detect aa deletion
  EXPECT_EQ(aaDeletionsExpected, aaChanges.aaDeletions);

  // Should detect aa substitution
  EXPECT_EQ(aaSubstitutionsExpected, aaChanges.aaSubstitutions);

  // Should modify nuc deletions in-place by adding aa changes
  EXPECT_EQ(nucDeletionsExpected, analysis.deletions);
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
  auto analysis = analyze(alignment.query, alignment.ref);


  const auto aaChanges = getAminoacidChanges(//
    alignment.ref,                           //
    alignment.query,                         //
    alignment.refPeptides,                   //
    alignment.queryPeptides,                 //
    analysis.substitutions,                  //
    analysis.deletions,                      //
    geneMap                                  //
  );                                         //

  const std::vector<AminoacidDeletion> aaDeletionsExpected = {
    AminoacidDeletion{
      .refAA = Aminoacid::F,
      .codon = 2,
      .gene = "Foo",
      .nucRange = {.begin = 36, .end = 39},
      .refCodon = toNucleotideSequence("TTT"),
    },
  };

  const std::vector<AminoacidSubstitution> aaSubstitutionsExpected = {
    AminoacidSubstitution{
      .refAA = Aminoacid::Q,
      .queryAA = Aminoacid::STOP,
      .codon = 3,
      .gene = "Foo",
      .nucRange = {.begin = 39, .end = 42},
      .refCodon = toNucleotideSequence("CAA"),
      .queryCodon = toNucleotideSequence("TAA"),
    },
  };

  const std::vector<NucleotideDeletion> nucDeletionsExpected = {
    NucleotideDeletion{
      .start = 38,
      .length = 3,
      .aaSubstitutions = aaSubstitutionsExpected,
      .aaDeletions = aaDeletionsExpected,
    },
  };


  // Should detect aa deletion
  EXPECT_EQ(aaDeletionsExpected, aaChanges.aaDeletions);

  // Should detect aa substitution
  EXPECT_EQ(aaSubstitutionsExpected, aaChanges.aaSubstitutions);

  // Should modify nuc deletions in-place by adding aa changes
  EXPECT_EQ(nucDeletionsExpected, analysis.deletions);
}
