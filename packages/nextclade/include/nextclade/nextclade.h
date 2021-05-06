#pragma once

#include <nextalign/nextalign.h>

#include <istream>
#include <map>
#include <optional>
#include <stdexcept>
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

    bool contains(int x) const {
      return x >= begin && x < end;
    }
  };

  inline bool operator==(const Range& left, const Range& right) {
    return (left.begin == right.begin && left.end == right.end);
  }

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

  struct AminoacidSubstitution;

  struct NucleotideSubstitution {
    Nucleotide refNuc;
    int pos;
    Nucleotide queryNuc;
    std::vector<PcrPrimer> pcrPrimersChanged;
    std::vector<AminoacidSubstitution> aaSubstitutions;
  };

  inline bool operator==(const NucleotideSubstitution& lhs, const NucleotideSubstitution& rhs) {
    return lhs.pos == rhs.pos && lhs.refNuc == rhs.refNuc && lhs.queryNuc == rhs.queryNuc;
  }

  inline bool operator<(const NucleotideSubstitution& lhs, const NucleotideSubstitution& rhs) {
    return (                                                                         //
      lhs.pos < rhs.pos ||                                                           //
      (lhs.pos == rhs.pos && lhs.refNuc < rhs.refNuc) ||                             //
      (lhs.pos == rhs.pos && lhs.refNuc == rhs.refNuc && lhs.queryNuc < rhs.queryNuc)//
    );
  }

  struct AminoacidDeletion;

  struct NucleotideDeletion {
    int start;
    int length;
    std::vector<AminoacidSubstitution> aaSubstitutions;
    std::vector<AminoacidDeletion> aaDeletions;
  };

  inline bool operator==(const NucleotideDeletion& lhs, const NucleotideDeletion& rhs) {
    return lhs.start == rhs.start && lhs.length == rhs.length;
  }

  using NucleotideInsertion = InsertionInternal<Nucleotide>;

  struct NucleotideRange {
    int begin;
    int end;
    int length;
    Nucleotide nuc;
  };

  inline bool operator==(const NucleotideRange& left, const NucleotideRange& right) {
    return (                        //
      left.begin == right.begin &&  //
      left.end == right.end &&      //
      left.length == right.length &&//
      left.nuc == right.nuc         //
    );
  }

  struct AminoacidSubstitution {
    std::string gene;
    Aminoacid refAA;
    int codon;
    Aminoacid queryAA;
    Range codonNucRange;
    NucleotideSequence refContext;
    NucleotideSequence queryContext;
    Range contextNucRange;
  };

  inline bool operator==(const AminoacidSubstitution& left, const AminoacidSubstitution& right) {
    return (                                       //
      left.gene == right.gene &&                   //
      left.refAA == right.refAA &&                 //
      left.codon == right.codon &&                 //
      left.queryAA == right.queryAA &&             //
      left.codonNucRange == right.codonNucRange && //
      left.refContext == right.refContext &&       //
      left.queryContext == right.queryContext &&   //
      left.contextNucRange == right.contextNucRange//
    );
  }

  inline bool operator<(const AminoacidSubstitution& left, const AminoacidSubstitution& right) {
    return (                                               //
      left.gene < right.gene ||                            //
      (left.gene == right.gene && left.codon < right.codon)//
    );
  }

  struct AminoacidDeletion {
    std::string gene;
    Aminoacid refAA;
    int codon;
    Range codonNucRange;
    NucleotideSequence refContext;
    NucleotideSequence queryContext;
    Range contextNucRange;
  };

  inline bool operator==(const AminoacidDeletion& left, const AminoacidDeletion& right) {
    return (                                       //
      left.gene == right.gene &&                   //
      left.refAA == right.refAA &&                 //
      left.codon == right.codon &&                 //
      left.codonNucRange == right.codonNucRange && //
      left.refContext == right.refContext &&       //
      left.queryContext == right.queryContext &&   //
      left.contextNucRange == right.contextNucRange//
    );
  }

  inline bool operator<(const AminoacidDeletion& left, const AminoacidDeletion& right) {
    return (                                               //
      left.gene < right.gene ||                            //
      (left.gene == right.gene && left.codon < right.codon)//
    );
  }

  struct PcrPrimer {
    std::string name;
    std::string target;
    std::string source;
    NucleotideSequence rootOligonuc;
    NucleotideSequence primerOligonuc;
    Range range;
    std::vector<NucleotideLocation> nonAcgts;
  };

  struct PcrPrimerChange {
    PcrPrimer primer;
    std::vector<NucleotideSubstitution> substitutions;
  };

  struct NucMutationsReport {
    std::vector<NucleotideSubstitution> substitutions;
    std::vector<NucleotideDeletion> deletions;
    int alignmentStart;
    int alignmentEnd;
  };

  struct AnalysisResult {
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
    std::vector<AminoacidSubstitution> aaSubstitutions;
    int totalAminoacidSubstitutions;
    std::vector<AminoacidDeletion> aaDeletions;
    int totalAminoacidDeletions;
    int alignmentStart;
    int alignmentEnd;
    int alignmentScore;
    std::map<Nucleotide, int> nucleotideComposition;
    std::vector<PcrPrimerChange> pcrPrimerChanges;
    int totalPcrPrimerChanges;
    int nearestNodeId;
    std::string clade;
    QcResult qc;
  };

  struct NextcladeResult {
    std::string ref;
    std::string query;
    std::vector<Peptide> refPeptides;
    std::vector<Peptide> queryPeptides;
    std::vector<std::string> warnings;
    AnalysisResult analysisResult;
  };

  class NextcladeAlgorithmImpl;

  class NextcladeAlgorithm {
    std::unique_ptr<NextcladeAlgorithmImpl> pimpl;

  public:
    explicit NextcladeAlgorithm(const NextcladeOptions& options);

    NextcladeResult run(const std::string& seqName, const NucleotideSequence& seq);

    const Tree& finalize(const std::vector<AnalysisResult>& results);

    // Destructor is required when using pimpl idiom with unique_ptr.
    // See "Effective Modern C++" by Scott Meyers,
    // "Item 22: When using the Pimpl Idiom, define special member functions in the implementation file".
    ~NextcladeAlgorithm();
    NextcladeAlgorithm(const NextcladeAlgorithm& other) = delete;
    NextcladeAlgorithm(NextcladeAlgorithm&& other) noexcept = delete;
    NextcladeAlgorithm& operator=(const NextcladeAlgorithm& other) = delete;
    NextcladeAlgorithm& operator=(NextcladeAlgorithm&& other) noexcept = delete;
  };

  QcConfig parseQcConfig(const std::string& qcConfigJsonStr);

  std::vector<PcrPrimer> parsePcrPrimersCsv(      //
    const std::string& pcrPrimersCsvString,       //
    const std::string& filename,                  //
    const NucleotideSequence& rootSeq,            //
    /* inout */ std::vector<std::string>& warnings//
  );

  class ErrorPcrPrimersCsvParserMissingColumn : public std::runtime_error {
  public:
    explicit ErrorPcrPrimersCsvParserMissingColumn(const std::string& colName);
  };

  class ErrorPcrPrimersCsvParserComplementUnknownNucleotide : public std::runtime_error {
  public:
    explicit ErrorPcrPrimersCsvParserComplementUnknownNucleotide(const std::string& nuc);
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

    std::string addRow(const AnalysisResult& result);

    std::string addErrorRow(const std::string& seqName, const std::string& errorFormatted);
  };

  class Tree {
    std::unique_ptr<TreeImpl> pimpl;

  public:
    explicit Tree(const std::string& auspiceJsonV2);

    TreeNode root() const;

    void addMetadata();

    std::string serialize(int spaces = 2) const;

    // Destructor is required when using pimpl idiom with unique_ptr.
    // See "Effective Modern C++" by Scott Meyers,
    // "Item 22: When using the Pimpl Idiom, define special member functions in the implementation file".
    ~Tree();
    Tree(const Tree& other) = delete;
    Tree(Tree&& other) noexcept = delete;
    Tree& operator=(const Tree& other) = delete;
    Tree& operator=(Tree&& other) noexcept = delete;
  };

  std::string serializeResults(const std::vector<AnalysisResult>& results);

  std::string formatRange(const Range& range);

  std::string formatMutation(const NucleotideSubstitution& mut);

  std::string formatDeletion(const NucleotideDeletion& del);

  std::string formatInsertion(const NucleotideInsertion& insertion);

  std::string formatInsertions(const std::vector<NucleotideInsertion>& insertions);

  std::string formatMissing(const NucleotideRange& missing);

  std::string formatNonAcgtn(const NucleotideRange& nonAcgtn);

  std::string formatPcrPrimerChange(const PcrPrimerChange& primerChange);

  std::string formatAminoacidMutationWithoutGene(const AminoacidSubstitution& mut);

  std::string formatAminoacidMutation(const AminoacidSubstitution& mut);

  std::string formatAminoacidDeletionWithoutGene(const AminoacidDeletion& del);

  std::string formatAminoacidDeletion(const AminoacidDeletion& del);

  std::string formatClusteredSnp(const ClusteredSnp& csnp);

  const char* getVersion();
}// namespace Nextclade
