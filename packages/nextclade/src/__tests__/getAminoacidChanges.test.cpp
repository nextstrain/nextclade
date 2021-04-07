#include "../../src/analyze/getAminoacidChanges.h"

#include <fmt/format.h>
#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextalign/private/nextalign_private.h>

#include <exception>
#include <fstream>
#include <vector>

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

  class GetAminoacidChanges : public ::testing::Test {
  private:
    NucleotideSequence parseRefFastaFile(const std::string& filename) {
      std::ifstream file(filename);
      if (!file.good()) {
        throw std::runtime_error(fmt::format("Error: unable to read \"{:s}\"\n", filename));
      }

      const auto refSeqs = parseSequences(file);
      if (refSeqs.size() != 1) {
        throw std::runtime_error(
          fmt::format("Error: {:d} sequences found in reference sequence file, expected 1", refSeqs.size()));
      }

      const auto& refSeq = refSeqs.front();
      return toNucleotideSequence(refSeq.seq);
    }

  protected:
    NucleotideSequence replace(const NucleotideSequence& seq, const std::string& nucs, int from) {
      return seq.substr(0, from) + toNucleotideSequence(nucs) + seq.substr(from + nucs.size());
    }

    NucleotideSequence remove(const NucleotideSequence& seq, int from, int len) {
      return seq.substr(0, from) + seq.substr(from + len);
    }
  };
}// namespace


TEST_F(GetAminoacidChanges, Finds_Aminoacid_Substitution) {
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

  // Should modify mutations in-place!
  EXPECT_ARR_EQ_UNORDERED(nucSubstitutionsExpected, analysis.substitutions);
}


TEST_F(GetAminoacidChanges, Finds_Aminoacid_Deletion) {
  // clang-format off
  //                                                                        30                            60
  //                                                                        v                             v
  const auto ref =   toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "CTACCAACTCAAACTGTTGATTCATCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  const auto query = toNucleotideSequence("CAGAATGCTGTAGCCTCAAAGATTTTGGGA" "ATT---ACTCAAACTGTTGATTCATCACAG" "GGCTCAGAATATGACTATGTCATATTCACTCAAACC");
  //                                                                           ^^^
  //                                                                 deletion of CCA at pos [33; 36)
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
      .refAA = Aminoacid::P,
      .codon = 1,
      .gene = "Hello",
      .nucRange = {.begin = 33, .end = 36},
      .refCodon = toNucleotideSequence("CCA"),
    },
  };

  const std::vector<NucleotideDeletion> nucDeletionsExpected = {
    NucleotideDeletion{
      .start = 33,
      .length = 3,
      .aaDeletions = aaDeletionsExpected,
    },
  };

  EXPECT_ARR_EQ_UNORDERED(aaDeletionsExpected, aaChanges.aaDeletions);

  // Should modify mutations in-place!
  EXPECT_ARR_EQ_UNORDERED(nucDeletionsExpected, analysis.deletions);
}
