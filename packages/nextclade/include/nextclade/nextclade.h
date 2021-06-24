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

  struct QCRulesConfigFrameShifts {
    bool enabled;
  };

  struct StopCodonLocation;

  struct QCRulesConfigStopCodons {
    bool enabled;
    std::vector<StopCodonLocation> knownStopCodons;
  };

  struct QcConfig {
    QCRulesConfigMissingData missingData;
    QCRulesConfigMixedSites mixedSites;
    QCRulesConfigPrivateMutations privateMutations;
    QCRulesConfigSnpClusters snpClusters;
    QCRulesConfigFrameShifts frameShifts;
    QCRulesConfigStopCodons stopCodons;
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

  struct QcResultFrameShifts {
    double score;
    QcStatus status;
    std::vector<FrameShift> frameShifts;
    int totalFrameShifts;
  };

  struct StopCodonLocation {
    std::string geneName;
    int codon;
  };

  inline bool operator==(const StopCodonLocation& left, const StopCodonLocation& right) {
    return (left.codon == right.codon && left.geneName == right.geneName);
  }

  struct QcResultStopCodons {
    double score;
    QcStatus status;
    std::vector<StopCodonLocation> stopCodons;
    int totalStopCodons;
  };

  struct QcResult {
    std::optional<QcResultMissingData> missingData;
    std::optional<QCResultMixedSites> mixedSites;
    std::optional<QcResultPrivateMutations> privateMutations;
    std::optional<QCResultSnpClusters> snpClusters;
    std::optional<QcResultFrameShifts> frameShifts;
    std::optional<QcResultStopCodons> stopCodons;
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
  struct AminoacidDeletion;

  struct NucleotideSubstitution {
    Nucleotide refNuc;
    int pos;
    Nucleotide queryNuc;
    std::vector<PcrPrimer> pcrPrimersChanged;
    std::vector<AminoacidSubstitution> aaSubstitutions;
    std::vector<AminoacidDeletion> aaDeletions;
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

  template<typename Letter>
  struct CharacterRange {
    int begin;
    int end;
    int length;
    Letter character;
  };

  using NucleotideRange = CharacterRange<Nucleotide>;
  using AminoacidRange = CharacterRange<Aminoacid>;

  struct GeneAminoacidRange {
    std::string geneName;
    Aminoacid character;
    std::vector<AminoacidRange> ranges;
    int length;
  };

  inline bool operator==(const NucleotideRange& left, const NucleotideRange& right) {
    return (                           //
      left.begin == right.begin &&     //
      left.end == right.end &&         //
      left.length == right.length &&   //
      left.character == right.character//
    );
  }

  inline bool operator==(const AminoacidRange& left, const AminoacidRange& right) {
    return (                           //
      left.begin == right.begin &&     //
      left.end == right.end &&         //
      left.length == right.length &&   //
      left.character == right.character//
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
    std::vector<NucleotideSubstitution> nucSubstitutions;
    std::vector<NucleotideDeletion> nucDeletions;
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
    std::vector<NucleotideSubstitution> nucSubstitutions;
    std::vector<NucleotideDeletion> nucDeletions;
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

  struct PcrPrimerCsvRow {
    /* 1 */ std::string source;
    /* 2 */ std::string target;
    /* 3 */ std::string name;
    /* 4 */ std::string primerOligonuc;
  };

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

  struct NucleotideChangesReport {
    std::vector<NucleotideSubstitution> substitutions;
    std::vector<NucleotideDeletion> deletions;
    int alignmentStart;
    int alignmentEnd;
  };

  struct AminoacidChangesReport {
    std::vector<AminoacidSubstitution> aaSubstitutions;
    std::vector<AminoacidDeletion> aaDeletions;
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
    std::vector<GeneAminoacidRange> unknownAaRanges;
    int totalUnknownAa;
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


  struct AnalysisResults {
    std::string schemaVersion;
    std::string nextcladeVersion;
    std::uint64_t timestamp;
    std::vector<Nextclade::AnalysisResult> results;
  };


  struct NextcladeResult {
    std::string ref;
    std::string query;
    std::vector<Peptide> refPeptides;
    std::vector<Peptide> queryPeptides;
    Warnings warnings;
    AnalysisResult analysisResult;
  };

  class NextcladeAlgorithmImpl;

  class NextcladeAlgorithm {
    std::unique_ptr<NextcladeAlgorithmImpl> pimpl;

  public:
    explicit NextcladeAlgorithm(const NextcladeOptions& options);

    NextcladeResult run(const std::string& seqName, const NucleotideSequence& seq);

    const Tree& getTree() const;

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

  std::vector<PcrPrimerCsvRow> parsePcrPrimersCsv(//
    const std::string& pcrPrimersCsvString,       //
    const std::string& filename                   //
  );

  std::vector<PcrPrimer> convertPcrPrimerRows(           //
    const std::vector<PcrPrimerCsvRow>& pcrPrimerCsvRows,//
    const NucleotideSequence& rootSeq,                   //
    /* inout */ std::vector<std::string>& warnings       //
  );

  std::vector<PcrPrimer> parseAndConvertPcrPrimersCsv(//
    const std::string& pcrPrimersCsvString,           //
    const std::string& filename,                      //
    const NucleotideSequence& rootSeq,                //
    /* inout */ std::vector<std::string>& warnings    //
  );

  class ErrorPcrPrimersCsvParserMissingColumn : public ErrorFatal {
  public:
    explicit ErrorPcrPrimersCsvParserMissingColumn(const std::string& colName);
  };

  class ErrorPcrPrimersCsvParserComplementUnknownNucleotide : public ErrorFatal {
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
    Tree& operator=(const Tree& other) = delete;
    Tree(Tree&& other) noexcept;
    Tree& operator=(Tree&& other) noexcept;
  };

  GeneMap parseGeneMap(const std::string& geneMapStr);

  std::vector<PcrPrimerCsvRow> parsePcrPrimerCsvRowsStr(const std::string& pcrPrimerCsvRowsStr);

  AnalysisResults parseAnalysisResults(const std::string& analysisResultsStr);

  std::string serializePcrPrimerRowsToString(const std::vector<PcrPrimerCsvRow>& pcrPrimers);

  std::string serializeWarningsToString(const Warnings& warnings);

  std::string serializeGeneMap(const GeneMap& geneMap);

  std::string serializeQcConfig(Nextclade::QcConfig& qcConfig);

  std::string serializePeptidesToString(const std::vector<Peptide>& peptides);

  std::string serializeResultToString(const AnalysisResult& result);

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

  std::string formatFrameShift(const FrameShift& frameShift);

  std::string formatStopCodon(const StopCodonLocation& stopCodon);

  const char* getVersion();
}// namespace Nextclade
