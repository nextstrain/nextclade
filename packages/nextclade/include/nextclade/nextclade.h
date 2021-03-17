#pragma once

#include <nextalign/nextalign.h>

#include <map>


namespace Nextclade {
  class Tree;

  struct NucleotideSubstitution;

  using MutationMap = std::map<int, Nucleotide>;

  struct PcrPrimer {};

  struct QcConfig {};

  struct NextcladeOptions {
    NucleotideSequence ref;
    std::string treeString;
    std::vector<PcrPrimer> pcrPrimers;
    GeneMap geneMap;
    QcConfig qcRulesConfig;
    NextalignOptions nextalignOptions;
  };

  struct NucleotideSubstitution {
    Nucleotide refNuc;
    int pos;
    Nucleotide queryNuc;
  };

  struct NucleotideDeletion {
    int start;
    int length;
  };

  struct NucleotideInsertion {
    int pos;
    int length;
    NucleotideSequence ins;
  };

  struct NucleotideRange {
    int begin;
    int end;
    int length;
    Nucleotide nuc;
  };

  struct AnalysisResult {
    std::vector<NucleotideSubstitution> substitutions;
    std::vector<NucleotideDeletion> deletions;
    std::vector<NucleotideInsertion> insertions;
    int alignmentStart;
    int alignmentEnd;
  };

  struct NextcladeResultIntermediate {
    std::string seqName;
    std::vector<NucleotideSubstitution> substitutions;
    int totalSubstitutions;
    std::vector<NucleotideDeletion> deletions;
    int totalDeletions;
    std::vector<NucleotideInsertion> insertions;
    int totalInsertions;
    std::vector<NucleotideRange> missing;
    int totalMissing;
    std::vector<NucleotideRange> nonACGTNs;
    int totalNonACGTNs;
    int alignmentStart;
    int alignmentEnd;
    int alignmentScore;
  };

  struct NextcladeResult : public NextcladeResultIntermediate {};

  class NextcladeAlgorithmImpl;

  class NextcladeAlgorithm {
    std::unique_ptr<NextcladeAlgorithmImpl> pimpl;

  public:
    explicit NextcladeAlgorithm(const NextcladeOptions& options);

    NextcladeResult run(const std::string& seqName, const NucleotideSequence& seq);

    const Tree& finalize();

    // Destructor is required when using pimpl idiom with unique_ptr.
    // See "Effective Modern C++" by Scott Meyers,
    // "Item 22: When using the Pimpl Idiom, define special member functions in the implementation file".
    ~NextcladeAlgorithm();
    NextcladeAlgorithm(const NextcladeAlgorithm& other) = delete;
    NextcladeAlgorithm(NextcladeAlgorithm&& other) noexcept = delete;
    NextcladeAlgorithm& operator=(const NextcladeAlgorithm& other) = delete;
    NextcladeAlgorithm& operator=(NextcladeAlgorithm&& other) noexcept = delete;
  };

  const char* getVersion();
}// namespace Nextclade
