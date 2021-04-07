#include "../../src/analyze/getAminoacidChanges.h"

#include <fmt/format.h>
#include <gmock/gmock.h>
#include <gtest/gtest.h>
#include <nextalign/private/nextalign_private.h>

#include <exception>
#include <fstream>
#include <vector>

#include "../../../nextalign/src/align/alignPairwise.h"
#include "../../include/nextclade/nextclade.h"
#include "../../include/nextclade/private/nextclade_private.h"
#include "../../src/analyze/analyze.h"
#include "../../src/io/parseMutation.h"
#include "../../src/utils/safe_cast.h"


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
    NucleotideSequence rootSeq;

    GeneMap geneMap = GeneMap{
      {
        "ORF1a",//
        Gene{
          .geneName = "ORF1a",
          .start = 256,
          .end = 13468,
          .strand = "+",
          .frame = 0,
          .length = 13468 - 256,
        },
      },
    };

    GetAminoacidChanges() {
      rootSeq = parseRefFastaFile("data/sars-cov-2/reference.fasta");
    }

    NucleotideSequence replace(const NucleotideSequence& seq, const std::string& nucs, int from) {
      return seq.substr(0, from) + toNucleotideSequence(nucs) + seq.substr(from + nucs.size());
    }

    NucleotideSequence remove(const NucleotideSequence& seq, int from, int len) {
      return seq.substr(0, from) + seq.substr(from + len);
    }
  };
}// namespace


TEST_F(GetAminoacidChanges, Finds_Aminoacid_Substitution) {
  const int substitutionStart = 1342;
  const std::string substitution = "ACT";
  const auto query = replace(rootSeq, substitution, substitutionStart);
  const auto alignment = nextalignInternal(query, rootSeq, geneMap, getDefaultOptions());
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
      .queryAA = Aminoacid::T,
      .codon = 359,
      .gene = "ORF1a",
      .nucRange =
        {
          .begin = substitutionStart,
          .end = safe_cast<int>(substitutionStart + substitution.size()),
        },
      .refCodon = toNucleotideSequence("TTA"),
      .queryCodon = toNucleotideSequence("ACT"),
    },
  };

  const std::vector<NucleotideSubstitution> nucSubstitutionsExpected = {
    NucleotideSubstitution{
      .refNuc = Nucleotide::T,
      .pos = 1342,
      .queryNuc = Nucleotide::A,
      .aaSubstitutions = aaSubstitutionsExpected,
    },
    NucleotideSubstitution{
      .refNuc = Nucleotide::T,
      .pos = 1343,
      .queryNuc = Nucleotide::C,
      .aaSubstitutions = aaSubstitutionsExpected,
    },
    NucleotideSubstitution{
      .refNuc = Nucleotide::A,
      .pos = 1344,
      .queryNuc = Nucleotide::T,
      .aaSubstitutions = aaSubstitutionsExpected,
    },
  };


  EXPECT_ARR_EQ_UNORDERED(aaSubstitutionsExpected, aaChanges.aaSubstitutions);

  // Should modify mutations in-place!
  EXPECT_ARR_EQ_UNORDERED(nucSubstitutionsExpected, analysis.substitutions);
}


TEST_F(GetAminoacidChanges, Finds_Aminoacid_Deletion) {
  const int delStart = 1342;
  const int delLength = 3;
  const auto query = remove(rootSeq, delStart, delLength);
  const auto alignment = nextalignInternal(query, rootSeq, geneMap, getDefaultOptions());
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
      .refAA = Aminoacid::L,
      .codon = 359,
      .gene = "ORF1a",
      .nucRange =
        {
          .begin = delStart,
          .end = safe_cast<int>(delStart + delLength),
        },
      .refCodon = toNucleotideSequence("TTA"),
    },
  };

  const std::vector<NucleotideDeletion> nucDeletionsExpected = {
    NucleotideDeletion{
      .start = delStart,
      .length = delLength,
      .aaDeletions = aaDeletionsExpected,
    },
  };

  EXPECT_ARR_EQ_UNORDERED(aaDeletionsExpected, aaChanges.aaDeletions);

  // Should modify deletions in-place!
  EXPECT_ARR_EQ_UNORDERED(nucDeletionsExpected, analysis.deletions);
}
