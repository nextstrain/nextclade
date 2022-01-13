#pragma once

#include <common/safe_vector.h>
#include <nextalign/nextalign.h>

#include <istream>
#include <map>
#include <optional>
#include <stdexcept>
#include <string>

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

  struct FrameShiftLocation {
    std::string geneName;
    Range codonRange;
  };

  struct QCRulesConfigFrameShifts {
    bool enabled;
    safe_vector<FrameShiftLocation> ignoredFrameShifts;
  };

  struct StopCodonLocation;

  struct QCRulesConfigStopCodons {
    bool enabled;
    safe_vector<StopCodonLocation> ignoredStopCodons;
  };

  struct QcConfig {
    std::string schemaVersion;
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
    safe_vector<ClusteredSnp> clusteredSNPs;
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
    safe_vector<FrameShiftResult> frameShifts;
    int totalFrameShifts;
    safe_vector<FrameShiftResult> frameShiftsIgnored;
    int totalFrameShiftsIgnored;
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
    safe_vector<StopCodonLocation> stopCodons;
    int totalStopCodons;
    safe_vector<StopCodonLocation> stopCodonsIgnored;
    int totalStopCodonsIgnored;
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

  struct NucleotideLocation {
    int pos;
    Nucleotide nuc;
  };

  struct PcrPrimer;

  template<typename Letter>
  struct SubstitutionSimple {
    Letter ref;
    int pos;
    Letter qry;
  };

  template<typename Letter>
  struct DeletionSimple {
    Letter ref;
    int pos;
  };

  using NucleotideSubstitutionSimple = SubstitutionSimple<Nucleotide>;
  using NucleotideDeletionSimple = DeletionSimple<Nucleotide>;
  using AminoacidSubstitutionSimple = SubstitutionSimple<Aminoacid>;
  using AminoacidDeletionSimple = DeletionSimple<Aminoacid>;

  template<typename Letter>
  inline bool operator==(const SubstitutionSimple<Letter>& lhs, const SubstitutionSimple<Letter>& rhs) {
    return lhs.pos == rhs.pos && lhs.ref == rhs.ref && lhs.qry == rhs.qry;
  }

  template<typename Letter>
  inline bool operator<(const SubstitutionSimple<Letter>& lhs, const SubstitutionSimple<Letter>& rhs) {
    return (                                                         //
      lhs.pos < rhs.pos ||                                           //
      (lhs.pos == rhs.pos && lhs.ref < rhs.ref) ||                   //
      (lhs.pos == rhs.pos && lhs.ref == rhs.ref && lhs.qry < rhs.qry)//
    );
  }

  template<typename Letter>
  inline bool operator==(const DeletionSimple<Letter>& lhs, const DeletionSimple<Letter>& rhs) {
    return lhs.pos == rhs.pos && lhs.ref == rhs.ref;
  }

  template<typename Letter>
  inline bool operator<(const DeletionSimple<Letter>& lhs, const DeletionSimple<Letter>& rhs) {
    return (                                   //
      lhs.pos < rhs.pos ||                     //
      (lhs.pos == rhs.pos && lhs.ref < rhs.ref)//
    );
  }

  template<typename Letter>
  struct SubstitutionSimpleLabeled {
    SubstitutionSimple<Letter> substitution;
    std::vector<std::string> labels;
  };

  template<typename Letter>
  struct DeletionSimpleLabeled {
    DeletionSimple<Letter> deletion;
    std::vector<std::string> labels;
  };

  using NucleotideSubstitutionSimpleLabeled = SubstitutionSimpleLabeled<Nucleotide>;
  using NucleotideDeletionSimpleLabeled = DeletionSimpleLabeled<Nucleotide>;
  using AminoacidSubstitutionSimpleLabeled = SubstitutionSimpleLabeled<Aminoacid>;
  using AminoacidDeletionSimpleLabeled = DeletionSimpleLabeled<Aminoacid>;

  template<typename Letter>
  inline bool operator==(const SubstitutionSimpleLabeled<Letter>& lhs, const SubstitutionSimpleLabeled<Letter>& rhs) {
    return lhs.substitution == rhs.substitution && lhs.labels == rhs.labels;
  }

  template<typename Letter>
  inline bool operator<(const SubstitutionSimpleLabeled<Letter>& lhs, const SubstitutionSimpleLabeled<Letter>& rhs) {
    return (                                                           //
      lhs.substitution < rhs.substitution ||                           //
      (lhs.substitution == rhs.substitution && lhs.labels < rhs.labels)//
    );
  }

  template<typename Letter>
  inline bool operator==(const DeletionSimpleLabeled<Letter>& lhs, const DeletionSimpleLabeled<Letter>& rhs) {
    return lhs.deletion == rhs.deletion && lhs.labels == rhs.labels;
  }

  template<typename Letter>
  inline bool operator<(const DeletionSimpleLabeled<Letter>& lhs, const DeletionSimpleLabeled<Letter>& rhs) {
    return (                                                   //
      lhs.deletion < rhs.deletion ||                           //
      (lhs.deletion == rhs.deletion && lhs.labels < rhs.labels)//
    );
  }


  template<typename Letter>
  inline bool operator==(const SubstitutionSimpleLabeled<Letter>& labeled,
    const SubstitutionSimple<Letter>& substitution) {
    return substitution == labeled.substitution;
  }

  template<typename Letter>
  inline bool operator<(const SubstitutionSimpleLabeled<Letter>& labeled,
    const SubstitutionSimple<Letter>& substitution) {
    return substitution < labeled.substitution;
  }

  template<typename Letter>
  inline bool operator==(const DeletionSimpleLabeled<Letter>& labeled, const DeletionSimple<Letter>& deletion) {
    return deletion == labeled.deletion;
  }

  template<typename Letter>
  inline bool operator<(const DeletionSimpleLabeled<Letter>& labeled, const DeletionSimple<Letter>& deletion) {
    return deletion < labeled.deletion;
  }

  template<typename Letter>
  inline bool operator==(const SubstitutionSimple<Letter>& substitution,
    const SubstitutionSimpleLabeled<Letter>& labeled) {
    return substitution == labeled.substitution;
  }

  template<typename Letter>
  inline bool operator<(const SubstitutionSimple<Letter>& substitution,
    const SubstitutionSimpleLabeled<Letter>& labeled) {
    return substitution < labeled.substitution;
  }

  template<typename Letter>
  inline bool operator==(const DeletionSimple<Letter>& deletion, const DeletionSimpleLabeled<Letter>& labeled) {
    return deletion == labeled.deletion;
  }

  template<typename Letter>
  inline bool operator<(const DeletionSimple<Letter>& deletion, const DeletionSimpleLabeled<Letter>& labeled) {
    return deletion < labeled.deletion;
  }


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
    safe_vector<AminoacidRange> ranges;
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


  template<typename Letter>
  struct Substitution {};

  template<typename Letter>
  struct Deletion {};

  using NucleotideDeletion = Deletion<Nucleotide>;
  using NucleotideSubstitution = Substitution<Nucleotide>;
  using AminoacidSubstitution = Substitution<Aminoacid>;
  using AminoacidDeletion = Deletion<Aminoacid>;

  template<>
  struct Substitution<Nucleotide> {
    Nucleotide ref;
    int pos;
    Nucleotide qry;
    safe_vector<PcrPrimer> pcrPrimersChanged;
    safe_vector<AminoacidSubstitution> aaSubstitutions;
    safe_vector<AminoacidDeletion> aaDeletions;
  };

  inline bool operator==(const NucleotideSubstitution& lhs, const NucleotideSubstitution& rhs) {
    return lhs.pos == rhs.pos && lhs.ref == rhs.ref && lhs.qry == rhs.qry;
  }

  inline bool operator<(const NucleotideSubstitution& lhs, const NucleotideSubstitution& rhs) {
    return (                                                         //
      lhs.pos < rhs.pos ||                                           //
      (lhs.pos == rhs.pos && lhs.ref < rhs.ref) ||                   //
      (lhs.pos == rhs.pos && lhs.ref == rhs.ref && lhs.qry < rhs.qry)//
    );
  }

  template<>
  struct Deletion<Nucleotide> {
    int start;
    int length;
    safe_vector<AminoacidSubstitution> aaSubstitutions;
    safe_vector<AminoacidDeletion> aaDeletions;
  };

  inline bool operator==(const NucleotideDeletion& lhs, const NucleotideDeletion& rhs) {
    return lhs.start == rhs.start && lhs.length == rhs.length;
  }

  template<>
  struct Substitution<Aminoacid> {
    std::string gene;
    Aminoacid ref;
    int pos;
    Aminoacid qry;
    Range codonNucRange;
    NucleotideSequence refContext;
    NucleotideSequence queryContext;
    Range contextNucRange;
    safe_vector<NucleotideSubstitution> nucSubstitutions;
    safe_vector<NucleotideDeletion> nucDeletions;
  };

  inline bool operator==(const AminoacidSubstitution& left, const AminoacidSubstitution& right) {
    return (                                       //
      left.gene == right.gene &&                   //
      left.ref == right.ref &&                     //
      left.pos == right.pos &&                     //
      left.qry == right.qry &&                     //
      left.codonNucRange == right.codonNucRange && //
      left.refContext == right.refContext &&       //
      left.queryContext == right.queryContext &&   //
      left.contextNucRange == right.contextNucRange//
    );
  }

  inline bool operator<(const AminoacidSubstitution& left, const AminoacidSubstitution& right) {
    return (                                           //
      left.gene < right.gene ||                        //
      (left.gene == right.gene && left.pos < right.pos)//
    );
  }

  template<>
  struct Deletion<Aminoacid> {
    std::string gene;
    Aminoacid ref;
    int pos;
    Range codonNucRange;
    NucleotideSequence refContext;
    NucleotideSequence queryContext;
    Range contextNucRange;
    safe_vector<NucleotideSubstitution> nucSubstitutions;
    safe_vector<NucleotideDeletion> nucDeletions;
  };

  inline bool operator==(const AminoacidDeletion& left, const AminoacidDeletion& right) {
    return (                                       //
      left.gene == right.gene &&                   //
      left.ref == right.ref &&                     //
      left.pos == right.pos &&                     //
      left.codonNucRange == right.codonNucRange && //
      left.refContext == right.refContext &&       //
      left.queryContext == right.queryContext &&   //
      left.contextNucRange == right.contextNucRange//
    );
  }

  inline bool operator<(const AminoacidDeletion& left, const AminoacidDeletion& right) {
    return (                                           //
      left.gene < right.gene ||                        //
      (left.gene == right.gene && left.pos < right.pos)//
    );
  }

  template<typename Letter>
  struct PrivateMutations {
    safe_vector<SubstitutionSimple<Letter>> privateSubstitutions;
    safe_vector<DeletionSimple<Letter>> privateDeletions;
    safe_vector<SubstitutionSimple<Letter>> reversionSubstitutions;
    safe_vector<DeletionSimple<Letter>> reversionDeletions;
    safe_vector<SubstitutionSimpleLabeled<Letter>> labeledSubstitutions;
    safe_vector<DeletionSimpleLabeled<Letter>> labeledDeletions;
    safe_vector<SubstitutionSimple<Letter>> unlabeledSubstitutions;
    safe_vector<DeletionSimple<Letter>> unlabeledDeletions;
  };

  using PrivateNucleotideMutations = PrivateMutations<Nucleotide>;
  using PrivateAminoacidMutations = PrivateMutations<Aminoacid>;


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
    safe_vector<NucleotideLocation> nonAcgts;
  };

  struct PcrPrimerChange {
    PcrPrimer primer;
    safe_vector<NucleotideSubstitution> substitutions;
  };


  /** External data that contains labels to be assigned to mutations */
  template<typename Letter>
  struct MutationLabelMaps {
    safe_vector<SubstitutionSimpleLabeled<Letter>> substitutionLabelMap;
    safe_vector<DeletionSimpleLabeled<Letter>> deletionLabelMap;
  };

  /** Contains external configuration and data specific for a particular pathogen */
  struct VirusJson {
    std::string schemaVersion;
    MutationLabelMaps<Nucleotide> nucMutLabelMaps;
  };

  VirusJson parseVirusJson(const std::string& virusJsonStr);
  std::string serializeVirusJson(VirusJson& virusJson);

  struct NucleotideChangesReport {
    safe_vector<NucleotideSubstitution> substitutions;
    safe_vector<NucleotideDeletion> deletions;
    int alignmentStart;
    int alignmentEnd;
  };

  struct AminoacidChangesReport {
    safe_vector<AminoacidSubstitution> aaSubstitutions;
    safe_vector<AminoacidDeletion> aaDeletions;
  };

  struct AnalysisResult {
    std::string seqName;
    safe_vector<NucleotideSubstitution> substitutions;
    int totalSubstitutions;
    safe_vector<NucleotideDeletion> deletions;
    int totalDeletions;
    safe_vector<NucleotideInsertion> insertions;
    int totalInsertions;
    safe_vector<FrameShiftResult> frameShifts;
    int totalFrameShifts;
    safe_vector<NucleotideRange> missing;
    int totalMissing;
    safe_vector<NucleotideRange> nonACGTNs;
    int totalNonACGTNs;
    safe_vector<AminoacidSubstitution> aaSubstitutions;
    int totalAminoacidSubstitutions;
    safe_vector<AminoacidDeletion> aaDeletions;
    int totalAminoacidDeletions;
    safe_vector<GeneAminoacidRange> unknownAaRanges;
    int totalUnknownAa;
    int alignmentStart;
    int alignmentEnd;
    int alignmentScore;
    std::map<Nucleotide, int> nucleotideComposition;
    safe_vector<PcrPrimerChange> pcrPrimerChanges;
    int totalPcrPrimerChanges;
    int nearestNodeId;
    std::string clade;
    PrivateNucleotideMutations privateNucMutations;
    std::map<std::string, PrivateAminoacidMutations> privateAaMutations;
    std::set<std::string> missingGenes;
    double divergence;
    QcResult qc;
    std::map<std::string, std::string> customNodeAttributes;
  };


  struct AnalysisResults {
    std::string schemaVersion;
    std::string nextcladeVersion;
    std::uint64_t timestamp;
    safe_vector<std::string> cladeNodeAttrKeys;
    safe_vector<Nextclade::AnalysisResult> results;
  };


  struct NextcladeResult {
    std::string ref;
    std::string query;
    safe_vector<RefPeptide> refPeptides;
    safe_vector<Peptide> queryPeptides;
    Warnings warnings;
    AnalysisResult analysisResult;
  };

  struct NextcladeOptions {
    NucleotideSequence ref;
    std::string treeString;
    safe_vector<PcrPrimer> pcrPrimers;
    GeneMap geneMap;
    QcConfig qcRulesConfig;
    VirusJson virusJson;
    NextalignOptions nextalignOptions;
  };

  /**
   * Represents unit of measurement of divergence
   */
  enum class DivergenceUnits : int {
    NumSubstitutionsPerYear,       // number of substitutions per year
    NumSubstitutionsPerYearPerSite,// number of substitutions per year per site (i.e. divided by sequence length)
  };

  class NextcladeAlgorithmImpl;

  class NextcladeAlgorithm {
    std::unique_ptr<NextcladeAlgorithmImpl> pimpl;

  public:
    explicit NextcladeAlgorithm(const NextcladeOptions& options);

    safe_vector<std::string> getCladeNodeAttrKeys() const;

    NextcladeResult run(const std::string& seqName, const NucleotideSequence& seq);

    const Tree& getTree() const;

    const Tree& finalize(const safe_vector<AnalysisResult>& results);

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

  bool isQcConfigVersionRecent(const QcConfig& qcConfig);

  safe_vector<PcrPrimerCsvRow> parsePcrPrimersCsv(//
    const std::string& pcrPrimersCsvString,       //
    const std::string& filename                   //
  );

  safe_vector<PcrPrimer> convertPcrPrimerRows(           //
    const safe_vector<PcrPrimerCsvRow>& pcrPrimerCsvRows,//
    const NucleotideSequence& rootSeq,                   //
    /* inout */ safe_vector<std::string>& warnings       //
  );

  safe_vector<PcrPrimer> parseAndConvertPcrPrimersCsv(//
    const std::string& pcrPrimersCsvString,           //
    const std::string& filename,                      //
    const NucleotideSequence& rootSeq,                //
    /* inout */ safe_vector<std::string>& warnings    //
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

  class CsvWriterAbstract {
  public:
    CsvWriterAbstract() = default;
    virtual ~CsvWriterAbstract() = default;
    CsvWriterAbstract(const CsvWriterAbstract& other) = delete;
    CsvWriterAbstract(CsvWriterAbstract&& other) noexcept = delete;
    CsvWriterAbstract& operator=(const CsvWriterAbstract& other) = delete;
    CsvWriterAbstract& operator=(CsvWriterAbstract&& other) noexcept = delete;

    virtual void addRow(const AnalysisResult& result) = 0;

    virtual void addErrorRow(const std::string& seqName, const std::string& errorFormatted) = 0;

    virtual void write(std::ostream& outputStream) = 0;
  };

  std::unique_ptr<CsvWriterAbstract> createCsvWriter(const CsvWriterOptions& options = {},
    const safe_vector<std::string>& customNodeAttrKeys = {});

  class Tree {
    std::unique_ptr<TreeImpl> pimpl;

  public:
    explicit Tree(const std::string& auspiceJsonV2);

    TreeNode root() const;

    safe_vector<std::string> getCladeNodeAttrKeys() const;

    void addMetadata();

    double tmpMaxDivergence() const;

    void setTmpMaxDivergence(double maxDivergence);

    DivergenceUnits tmpDivergenceUnits() const;

    void setTmpDivergenceUnits(DivergenceUnits divergenceUnits);

    void removeTemporaries();

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

  safe_vector<PcrPrimerCsvRow> parsePcrPrimerCsvRowsStr(const std::string& pcrPrimerCsvRowsStr);

  AnalysisResults parseAnalysisResults(const std::string& analysisResultsStr);

  std::string serializePcrPrimerRowsToString(const safe_vector<PcrPrimerCsvRow>& pcrPrimers);

  std::string serializeWarningsToString(const Warnings& warnings);

  std::string serializeCladeNodeAttrKeys(const safe_vector<std::string>& keys);

  std::string serializeGeneMap(const GeneMap& geneMap);

  std::string serializeQcConfig(Nextclade::QcConfig& qcConfig);

  std::string serializePeptidesToString(const safe_vector<Peptide>& peptides);

  std::string serializeResultToString(const AnalysisResult& result);

  std::string serializeResults(const AnalysisResults& results);

  std::string formatRange(const Range& range);

  std::string formatMutationSimple(const NucleotideSubstitutionSimple& mut);

  std::string formatDeletionSimple(const NucleotideDeletionSimple& del);

  std::string formatAminoacidMutationSimpleWithoutGene(const AminoacidSubstitutionSimple& mut);

  std::string formatAminoacidDeletionSimpleWithoutGene(const AminoacidDeletionSimple& del);

  std::string formatMutation(const NucleotideSubstitution& mut);

  std::string formatDeletion(const NucleotideDeletion& del);

  std::string formatMissing(const NucleotideRange& missing);

  std::string formatNonAcgtn(const NucleotideRange& nonAcgtn);

  std::string formatPcrPrimerChange(const PcrPrimerChange& primerChange);

  std::string formatAminoacidMutationWithoutGene(const AminoacidSubstitution& mut);

  std::string formatAminoacidMutation(const AminoacidSubstitution& mut);

  std::string formatAminoacidDeletionWithoutGene(const AminoacidDeletion& del);

  std::string formatAminoacidDeletion(const AminoacidDeletion& del);

  std::string formatClusteredSnp(const ClusteredSnp& csnp);

  std::string formatFrameShift(const FrameShiftResult& frameShift);

  std::string formatStopCodon(const StopCodonLocation& stopCodon);

  const char* getVersion();

  const char* getAnalysisResultsJsonSchemaVersion();

  const char* getQcConfigJsonSchemaVersion();
}// namespace Nextclade
