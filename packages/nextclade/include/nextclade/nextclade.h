#pragma once

#include <nextalign/nextalign.h>

#include <map>
#include <optional>
#include <sstream>
#include <string>
#include <vector>


namespace Nextclade {
  class Tree;
  class TreeImpl;
  class TreeNode;

  struct QCRulesConfigMissingData {
    bool enabled;
    double missingDataThreshold;
    double scoreBias;
  };

  struct QCRulesConfigMixedSites {
    bool enabled;
    double mixedSitesThreshold;
  };

  struct QCRulesConfigPrivateMutations {
    bool enabled;
    double typical;
    double cutoff;
  };

  struct QCRulesConfigSnpClusters {
    bool enabled;
    double windowSize;
    double clusterCutOff;
    double scoreWeight;
  };

  struct QcConfig {
    QCRulesConfigMissingData missingData;
    QCRulesConfigMixedSites mixedSites;
    QCRulesConfigPrivateMutations privateMutations;
    QCRulesConfigSnpClusters snpClusters;
  };

  enum class QcStatus : char {
    good = 1,
    mediocre = 2,
    bad = 3,
  };


  struct QCResultMixedSites {
    double score;
    QcStatus status;
    int totalMixedSites;
    double mixedSitesThreshold;
  };

  struct ClusteredSnp {
    int start;
    int end;
    int numberOfSNPs;
  };

  struct QCResultSnpClusters {
    double score;
    QcStatus status;
    int totalSNPs;
    std::vector<ClusteredSnp> clusteredSNPs;
  };

  struct QcResultMissingData {
    double score;
    QcStatus status;
    int totalMissing;
    double missingDataThreshold;
  };

  struct QcResultPrivateMutations {
    double score;
    QcStatus status;
    double total;
    double excess;
    double cutoff;
  };


  struct QcResult {
    std::optional<QcResultMissingData> missingData;
    std::optional<QCResultMixedSites> mixedSites;
    std::optional<QcResultPrivateMutations> privateMutations;
    std::optional<QCResultSnpClusters> snpClusters;
    double overallScore;
    QcStatus overallStatus;
  };

  /** Represents a numeric interval bounded by begin and end. Similar to `Span`, but different representation. */
  struct Range {
    int begin;
    int end;
  };

  /** Represents a numeric interval bounded by start and length. Similar to `Range`, but different representation. */
  struct Span {
    int start;
    int length;
  };

  struct NucleotideLocation {
    int pos;
    Nucleotide nuc;
  };

  struct PcrPrimer;

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
    std::vector<PcrPrimer> pcrPrimersChanged;
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

  struct PcrPrimer {
    std::string name;
    std::string target;
    std::string source;
    NucleotideSequence rootOligonuc;
    NucleotideSequence primerOligonuc;
    Range range;
    std::vector<NucleotideLocation> nonACGTs;
  };

  struct PcrPrimerChange {
    PcrPrimer primer;
    std::vector<NucleotideSubstitution> substitutions;
  };

  struct AminoacidSubstitution {
    Aminoacid refAA;
    int codon;
    Aminoacid queryAA;
    std::string gene;
    NucleotideRange nucRange;
    NucleotideSequence refCodon;
    NucleotideSequence queryCodon;
  };

  struct AminoacidDeletion {
    Aminoacid refAA;
    int codon;
    std::string gene;
    NucleotideRange nucRange;
    NucleotideSequence refCodon;
  };

  struct AnalysisResult {
    std::vector<NucleotideSubstitution> substitutions;
    std::vector<NucleotideDeletion> deletions;
    std::vector<NucleotideInsertion> insertions;
    int alignmentStart;
    int alignmentEnd;
  };

  struct NextcladeResult {
    std::string seqName;
    std::string ref;
    std::string query;
    std::vector<Peptide> refPeptides;
    std::vector<Peptide> queryPeptides;
    std::vector<Insertion> insertionsStripped;// FIXME: How `insertions` related to `insertionsStripped`?
    std::vector<std::string> warnings;
    std::vector<NucleotideSubstitution> substitutions;
    int totalSubstitutions;
    std::vector<NucleotideDeletion> deletions;
    int totalDeletions;
    std::vector<NucleotideInsertion> insertions;
    int totalInsertions;
    std::vector<NucleotideRange> missing;
    int totalMissing;
    std::vector<NucleotideRange> nonACGTNs;
    std::vector<AminoacidSubstitution> aaSubstitutions;
    int totalAminoacidSubstitutions;
    std::vector<AminoacidDeletion> aaDeletions;
    int totalAminoacidDeletions;
    int totalNonACGTNs;
    int alignmentStart;
    int alignmentEnd;
    int alignmentScore;
    int nearestNodeId;
    std::map<Nucleotide, int> nucleotideComposition;
    std::vector<PcrPrimerChange> pcrPrimerChanges;
    int totalPcrPrimerChanges;
    std::string clade;
    QcResult qc;
  };

  class NextcladeAlgorithmImpl;

  class NextcladeAlgorithm {
    std::unique_ptr<NextcladeAlgorithmImpl> pimpl;

  public:
    explicit NextcladeAlgorithm(const NextcladeOptions& options);

    NextcladeResult run(const std::string& seqName, const NucleotideSequence& seq);

    void saveResult(const NextcladeResult& analysisResult);

    const Tree& finalize();

    const std::vector<NextcladeResult>& getResults() const;

    // Destructor is required when using pimpl idiom with unique_ptr.
    // See "Effective Modern C++" by Scott Meyers,
    // "Item 22: When using the Pimpl Idiom, define special member functions in the implementation file".
    ~NextcladeAlgorithm();
    NextcladeAlgorithm(const NextcladeAlgorithm& other) = delete;
    NextcladeAlgorithm(NextcladeAlgorithm&& other) noexcept = delete;
    NextcladeAlgorithm& operator=(const NextcladeAlgorithm& other) = delete;
    NextcladeAlgorithm& operator=(NextcladeAlgorithm&& other) noexcept = delete;
  };

  struct CsvWriterOptions {
    char delimiter = ';';
  };

  class CsvWriter {
    CsvWriterOptions options;
    std::ostream& outputStream;

    std::string prepareRow(const std::vector<std::string>& columns) const;

  public:
    explicit CsvWriter(std::ostream& outputStream, const CsvWriterOptions& options = {});

    std::string addHeader();

    std::string addRow(const NextcladeResult& result);

    std::string addErrorRow(const std::string& error);
  };

  class Tree {
    std::unique_ptr<TreeImpl> pimpl;

  public:
    explicit Tree(const std::string& auspiceJsonV2);

    TreeNode root() const;

    std::string serialize(int spaces = 4) const;

    // Destructor is required when using pimpl idiom with unique_ptr.
    // See "Effective Modern C++" by Scott Meyers,
    // "Item 22: When using the Pimpl Idiom, define special member functions in the implementation file".
    ~Tree();
    Tree(const Tree& other) = delete;
    Tree(Tree&& other) noexcept = delete;
    Tree& operator=(const Tree& other) = delete;
    Tree& operator=(Tree&& other) noexcept = delete;
  };

  std::string serializeResults(const std::vector<NextcladeResult>& results);

  const char* getVersion();
}// namespace Nextclade
