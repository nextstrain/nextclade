#include "parseAnalysisResults.h"

#include <common/safe_vector.h>
#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>
#include <nextclade_json/nextclade_json.h>
#include <utils/mapFind.h>

#include <nlohmann/json.hpp>
#include <string>

#include "formatQcStatus.h"

namespace Nextclade {
  using json = nlohmann::ordered_json;
  using json_pointer = json::json_pointer;


  class ErrorAnalysisResultsRootTypeInvalid : public ErrorNonFatal {
  public:
    explicit ErrorAnalysisResultsRootTypeInvalid(const std::string& type)
        : ErrorNonFatal(fmt::format("Expected to find an object as the root entry, but found \"{:s}\"", type)) {}
  };


  class ErrorAnalysisResultsQcStatusInvalid : public ErrorNonFatal {
  public:
    explicit ErrorAnalysisResultsQcStatusInvalid(const std::string& statusStr)
        : ErrorNonFatal(fmt::format("QC status not recognized: \"{:s}\"", statusStr)) {}
  };


  NucleotideLocation parseNucleotideLocation(const json& j) {
    return NucleotideLocation{
      .pos = at(j, "pos").get<int>(),
      .nuc = stringToNuc(at(j, "nuc")),
    };
  }

  Range parseRange(const json& j) {
    return Range{
      .begin = at(j, "begin").get<int>(),
      .end = at(j, "end").get<int>(),
    };
  }

  PcrPrimer parsePcrPrimer(const json& j) {
    return PcrPrimer{
      .name = at(j, "name"),
      .target = at(j, "target"),
      .source = at(j, "source"),
      .rootOligonuc = toNucleotideSequence(at(j, "rootOligonuc")),
      .primerOligonuc = toNucleotideSequence(at(j, "primerOligonuc")),
      .range = parseRange(at(j, "range")),
      .nonAcgts = parseArray<NucleotideLocation>(j, "nonACGTs", parseNucleotideLocation),
    };
  }

  AminoacidSubstitution parseAminoacidSubstitution(const json& j) {
    return AminoacidSubstitution{
      .gene = at(j, "gene"),
      .ref = stringToAa(at(j, "refAA")),
      .pos = at(j, "codon").get<int>(),
      .qry = stringToAa(at(j, "queryAA")),
      .codonNucRange = parseRange(at(j, "codonNucRange")),
      .refContext = toNucleotideSequence(at(j, "refContext")),
      .queryContext = toNucleotideSequence(at(j, "queryContext")),
      .contextNucRange = parseRange(at(j, "contextNucRange")),
      .nucSubstitutions = {},// FIXME: this field is not parsed. Looks like it was forgotten.
      .nucDeletions = {},    // FIXME: this field is not parsed. Looks like it was forgotten.
    };
  }

  AminoacidDeletion parseAminoacidDeletion(const json& j) {
    return AminoacidDeletion{
      .gene = at(j, "gene"),
      .ref = stringToAa(at(j, "refAA")),
      .pos = at(j, "codon").get<int>(),
      .codonNucRange = parseRange(at(j, "codonNucRange")),
      .refContext = toNucleotideSequence(at(j, "refContext")),
      .queryContext = toNucleotideSequence(at(j, "queryContext")),
      .contextNucRange = parseRange(at(j, "contextNucRange")),
      .nucSubstitutions = {},// FIXME: this field is not parsed. Looks like it was forgotten.
      .nucDeletions = {},    // FIXME: this field is not parsed. Looks like it was forgotten.
    };
  }

  AminoacidRange parseAminoacidRange(const json& j);

  GeneAminoacidRange parseGeneAminoacidRange(const json& j) {
    return GeneAminoacidRange{
      .geneName = at(j, "geneName"),
      .character = stringToAa(at(j, "character")),
      .ranges = parseArray<AminoacidRange>(j, "ranges", parseAminoacidRange),
      .length = at(j, "length"),
    };
  }

  NucleotideSubstitution parseNucleotideSubstitution(const json& j) {
    return NucleotideSubstitution{
      .ref = stringToNuc(at(j, "refNuc")),
      .pos = at(j, "pos").get<int>(),
      .qry = stringToNuc(at(j, "queryNuc")),
      .pcrPrimersChanged = parseArray<PcrPrimer>(j, "pcrPrimersChanged", parsePcrPrimer),
      .aaSubstitutions = parseArray<AminoacidSubstitution>(j, "aaSubstitutions", parseAminoacidSubstitution),
      .aaDeletions = parseArray<AminoacidDeletion>(j, "aaDeletions", parseAminoacidDeletion),
    };
  }

  NucleotideDeletion parseNucleotideDeletion(const json& j) {
    return NucleotideDeletion{
      .start = at(j, "start").get<int>(),
      .length = at(j, "length").get<int>(),
      .aaSubstitutions = parseArray<AminoacidSubstitution>(j, "aaSubstitutions", parseAminoacidSubstitution),
      .aaDeletions = parseArray<AminoacidDeletion>(j, "aaDeletions", parseAminoacidDeletion),
    };
  }

  NucleotideInsertion parseNucleotideInsertion(const json& j) {
    return NucleotideInsertion{
      .pos = at(j, "pos").get<int>(),
      .length = at(j, "length").get<int>(),
      .ins = toNucleotideSequence(at(j, "ins")),
    };
  }

  template<typename Letter>
  SubstitutionSimple<Letter> parseSubstitutionSimple(const json& j) {
    return SubstitutionSimple<Letter>{
      .ref = stringToLetter<Letter>(at(j, "ref"), LetterTag<Letter>{}),
      .pos = at(j, "pos").get<int>(),
      .qry = stringToLetter<Letter>(at(j, "qry"), LetterTag<Letter>{}),
    };
  }

  template<typename Letter>
  DeletionSimple<Letter> parseDeletionSimple(const json& j) {
    return DeletionSimple<Letter>{
      .ref = stringToLetter(at(j, "ref"), LetterTag<Letter>{}),
      .pos = at(j, "pos").get<int>(),
    };
  }

  template<typename Letter>
  SubstitutionSimpleLabeled<Letter> parseSubstitutionSimpleLabeled(const json& j) {
    return SubstitutionSimpleLabeled<Letter>{
      .substitution = parseSubstitutionSimple<Letter>(j.at("substitution")),
      .labels = parseArrayOfStrings(j.at("labels")),
    };
  }

  template<typename Letter>
  DeletionSimpleLabeled<Letter> parseDeletionSimpleLabeled(const json& j) {
    return DeletionSimpleLabeled<Letter>{
      .deletion = parseDeletionSimple<Letter>(j.at("deletion")),
      .labels = parseArrayOfStrings(j.at("labels")),
    };
  }

  template<typename Letter>
  PrivateMutations<Letter> parsePrivateMutations(const json& j) {
    // clang-format off
    return PrivateMutations<Letter>{
      .privateSubstitutions =   parseArray<SubstitutionSimple<Letter>>(j, "privateSubstitutions", parseSubstitutionSimple<Letter>),
      .privateDeletions =       parseArray<DeletionSimple<Letter>>(j, "privateDeletions", parseDeletionSimple<Letter>),
      .reversionSubstitutions = parseArray<SubstitutionSimple<Letter>>(j, "reversionSubstitutions", parseSubstitutionSimple<Letter>),
      .reversionDeletions =     parseArray<DeletionSimple<Letter>>(j, "reversionDeletions", parseDeletionSimple<Letter>),
      .labeledSubstitutions =   parseArray<SubstitutionSimpleLabeled<Letter>>(j, "labeledSubstitutions", parseSubstitutionSimpleLabeled<Letter>),
      .labeledDeletions =       parseArray<DeletionSimpleLabeled<Letter>>(j, "labeledDeletions", parseDeletionSimpleLabeled<Letter>),
      .unlabeledSubstitutions = parseArray<SubstitutionSimple<Letter>>(j, "unlabeledSubstitutions", parseSubstitutionSimple<Letter>),
      .unlabeledDeletions =     parseArray<DeletionSimple<Letter>>(j, "unlabeledDeletions", parseDeletionSimple<Letter>),
    };
    // clang-format on
  }

  Range parseFrameShiftRange(const json& j) {
    return Range{
      .begin = at(j, "begin").get<int>(),
      .end = at(j, "end").get<int>(),
    };
  }

  FrameShiftContext parseFrameShiftContext(const json& j) {
    return FrameShiftContext{
      .codon = parseFrameShiftRange(at(j, "codon")),
    };
  }

  FrameShiftResult parseFrameShiftResult(const json& j) {
    return FrameShiftResult{
      .geneName = at(j, "geneName").get<std::string>(),
      .nucRel = parseFrameShiftRange(at(j, "nucRel")),
      .nucAbs = parseFrameShiftRange(at(j, "nucAbs")),
      .codon = parseFrameShiftRange(at(j, "codon")),
      .gapsLeading = parseFrameShiftContext(at(j, "gapsLeading")),
      .gapsTrailing = parseFrameShiftContext(at(j, "gapsTrailing")),
    };
  }

  NucleotideRange parseNucleotideRange(const json& j) {
    return NucleotideRange{
      .begin = at(j, "begin").get<int>(),
      .end = at(j, "end").get<int>(),
      .length = at(j, "length").get<int>(),
      .character = stringToNuc(at(j, "character")),
    };
  }

  AminoacidRange parseAminoacidRange(const json& j) {
    return AminoacidRange{
      .begin = at(j, "begin").get<int>(),
      .end = at(j, "end").get<int>(),
      .length = at(j, "length").get<int>(),
      .character = stringToAa(at(j, "character")),
    };
  }

  PcrPrimerChange parsePcrPrimerChange(const json& j) {
    return PcrPrimerChange{
      .primer = parsePcrPrimer(at(j, "primer")),
      .substitutions = parseArray<NucleotideSubstitution>(j, "substitutions", parseNucleotideSubstitution),
    };
  }

  std::map<Nucleotide, int> parseNucleotideComposition(const json& j) {

    std::map<Nucleotide, int> nucComp;
    for (const auto& a : j.items()) {
      const auto& nuc = stringToNuc(a.key());
      const auto& num = a.value().get<int>();
      nucComp[nuc] = num;
    }
    return nucComp;
  }


  QcStatus parseQcStatus(const frozen::string& statusStr) {
    const auto status = mapFind(qcStringsStatus, statusStr);
    if (!status) {
      throw ErrorAnalysisResultsQcStatusInvalid(statusStr.data());
    }
    return *status;
  }

  std::optional<QcResultMissingData> parseQcMissingData(const json& jj) {
    if (!jj.contains("missingData")) {
      return {};
    }
    const auto& j = at(jj, "missingData");
    return QcResultMissingData{
      .score = parseDouble(j, "score"),
      .status = parseQcStatus(frozen::string{j["status"].get<std::string>()}),
      .totalMissing = parseInt(j, "totalMissing"),
      .missingDataThreshold = parseDouble(j, "missingDataThreshold"),
    };
  }

  std::optional<QCResultMixedSites> parseQcMixedSites(const json& jj) {
    if (!jj.contains("mixedSites")) {
      return {};
    }
    const auto& j = at(jj, "mixedSites");
    return QCResultMixedSites{
      .score = parseDouble(j, "score"),
      .status = parseQcStatus(frozen::string{j["status"].get<std::string>()}),
      .totalMixedSites = parseInt(j, "totalMixedSites"),
      .mixedSitesThreshold = parseDouble(j, "mixedSitesThreshold"),
    };
  }

  std::optional<QcResultPrivateMutations> parseQcPrivateMutations(const json& jj) {
    if (!jj.contains("privateMutations")) {
      return {};
    }
    const auto& j = at(jj, "privateMutations");
    return QcResultPrivateMutations{
      .score = parseDouble(j, "score"),
      .status = parseQcStatus(frozen::string{j["status"].get<std::string>()}),
      .total = parseDouble(j, "total"),
      .excess = parseDouble(j, "excess"),
      .cutoff = parseDouble(j, "cutoff"),
    };
  }

  ClusteredSnp parseClusteredSnp(const json& j) {
    return ClusteredSnp{
      .start = parseInt(j, "start"),
      .end = parseInt(j, "end"),
      .numberOfSNPs = parseInt(j, "numberOfSNPs"),
    };
  }

  std::optional<QCResultSnpClusters> parseQcSnpClusters(const json& jj) {
    if (!jj.contains("snpClusters")) {
      return {};
    }
    const auto& j = at(jj, "snpClusters");
    return QCResultSnpClusters{
      .score = parseDouble(j, "score"),
      .status = parseQcStatus(frozen::string{j["status"].get<std::string>()}),
      .totalSNPs = parseInt(j, "totalSNPs"),
      .clusteredSNPs = parseArray<ClusteredSnp>(j, "clusteredSNPs", parseClusteredSnp),
    };
  }

  FrameShiftLocation parseFrameShiftLocation(const json& j) {
    return FrameShiftLocation{
      .geneName = at(j, "geneName"),
      .codonRange = parseRange(at(j, "codonRange")),
    };
  }

  std::optional<QcResultFrameShifts> parseQcFrameShifts(const json& jj) {
    if (!jj.contains("frameShifts")) {
      return {};
    }
    const auto& j = at(jj, "frameShifts");
    return QcResultFrameShifts{
      .score = parseDouble(j, "score"),
      .status = parseQcStatus(frozen::string{j["status"].get<std::string>()}),
      .frameShifts = parseArray<FrameShiftResult>(j, "frameShifts", parseFrameShiftResult),
      .totalFrameShifts = parseInt(j, "totalFrameShifts"),
      .frameShiftsIgnored = parseArray<FrameShiftResult>(j, "frameShiftsIgnored", parseFrameShiftResult),
      .totalFrameShiftsIgnored = parseInt(j, "totalFrameShiftsIgnored"),
    };
  }

  StopCodonLocation parseStopCodonLocation(const json& j) {
    return StopCodonLocation{
      .geneName = at(j, "geneName"),
      .codon = parseInt(j, "codon"),
    };
  }

  std::optional<QcResultStopCodons> parseQcStopCodons(const json& jj) {
    if (!jj.contains("stopCodons")) {
      return {};
    }
    const auto& j = at(jj, "stopCodons");
    return QcResultStopCodons{
      .score = parseDouble(j, "score"),
      .status = parseQcStatus(frozen::string{j["status"].get<std::string>()}),
      .stopCodons = parseArray<StopCodonLocation>(j, "stopCodons", parseStopCodonLocation),
      .totalStopCodons = parseInt(j, "totalStopCodons"),
      .stopCodonsIgnored = parseArray<StopCodonLocation>(j, "stopCodonsIgnored", parseStopCodonLocation),
      .totalStopCodonsIgnored = parseInt(j, "totalStopCodonsIgnored"),
    };
  }

  QcResult parseQcResult(const json& j) {
    return QcResult{
      .missingData = parseQcMissingData(j),
      .mixedSites = parseQcMixedSites(j),
      .privateMutations = parseQcPrivateMutations(j),
      .snpClusters = parseQcSnpClusters(j),
      .frameShifts = parseQcFrameShifts(j),
      .stopCodons = parseQcStopCodons(j),
      .overallScore = parseDouble(j, "overallScore"),
      .overallStatus = parseQcStatus(frozen::string{j["overallStatus"].get<std::string>()}),
    };
  }

  AnalysisResult parseAnalysisResult(const json& j) {
    try {
      return AnalysisResult{
        .seqName = at(j, "seqName").get<std::string>(),
        .substitutions = parseArray<NucleotideSubstitution>(j, "substitutions", parseNucleotideSubstitution),
        .totalSubstitutions = at(j, "totalSubstitutions"),
        .deletions = parseArray<NucleotideDeletion>(j, "deletions", parseNucleotideDeletion),
        .totalDeletions = at(j, "totalDeletions"),
        .insertions = parseArray<NucleotideInsertion>(j, "insertions", parseNucleotideInsertion),
        .totalInsertions = at(j, "totalInsertions"),
        .frameShifts = parseArray<FrameShiftResult>(j, "frameShifts", parseFrameShiftResult),
        .totalFrameShifts = at(j, "totalFrameShifts"),
        .missing = parseArray<NucleotideRange>(j, "missing", parseNucleotideRange),
        .totalMissing = at(j, "totalMissing"),
        .nonACGTNs = parseArray<NucleotideRange>(j, "nonACGTNs", parseNucleotideRange),
        .totalNonACGTNs = at(j, "totalNonACGTNs"),
        .aaSubstitutions = parseArray<AminoacidSubstitution>(j, "aaSubstitutions", parseAminoacidSubstitution),
        .totalAminoacidSubstitutions = at(j, "totalAminoacidSubstitutions"),
        .aaDeletions = parseArray<AminoacidDeletion>(j, "aaDeletions", parseAminoacidDeletion),
        .totalAminoacidDeletions = at(j, "totalAminoacidDeletions"),
        .unknownAaRanges = parseArray<GeneAminoacidRange>(j, "unknownAaRanges", parseGeneAminoacidRange),
        .totalUnknownAa = at(j, "totalUnknownAa"),
        .alignmentStart = at(j, "alignmentStart"),
        .alignmentEnd = at(j, "alignmentEnd"),
        .alignmentScore = at(j, "alignmentScore"),
        .nucleotideComposition = parseNucleotideComposition(at(j, "nucleotideComposition")),
        .pcrPrimerChanges = parseArray<PcrPrimerChange>(j, "pcrPrimerChanges", parsePcrPrimerChange),
        .totalPcrPrimerChanges = at(j, "totalPcrPrimerChanges"),
        .nearestNodeId = at(j, "nearestNodeId"),
        .clade = at(j, "clade"),
        .privateNucMutations = parsePrivateMutations<Nucleotide>(at(j, "privateNucMutations")),
        .privateAaMutations =
          parseMap<std::string, PrivateAminoacidMutations>(j, "privateAaMutations", parsePrivateMutations<Aminoacid>),
        .missingGenes = parseSet<std::string>(at(j, "missingGenes")),
        .divergence = at(j, "divergence"),
        .qc = parseQcResult(at(j, "qc")),
        .customNodeAttributes = parseMap<std::string, std::string>(j, "customNodeAttributes"),
      };
    } catch (const std::exception& e) {
      throw ErrorFatal(fmt::format("When parsing analysis result json (for one sequence): {:s}", e.what()));
    }
  }

  AnalysisResults parseAnalysisResults(const std::string& analysisResultsStr) {
    try {
      const auto j = json::parse(analysisResultsStr);
      if (!j.is_object()) {
        throw ErrorAnalysisResultsRootTypeInvalid(j.type_name());
      }

      return AnalysisResults{
        .schemaVersion = at(j, "schemaVersion"),
        .nextcladeVersion = at(j, "nextcladeVersion"),
        .timestamp = at(j, "timestamp"),
        .cladeNodeAttrKeys = at(j, "cladeNodeAttrKeys"),
        .results = parseArray<AnalysisResult>(j, "results", parseAnalysisResult),
      };
    } catch (const std::exception& e) {
      throw ErrorFatal(fmt::format("When parsing analysis results json (for multiple sequences): {:s}", e.what()));
    }
  }

  PcrPrimerCsvRow parsePcrPrimerCsvRow(const json& j) {
    return PcrPrimerCsvRow{
      .source = at(j, "source"),
      .target = at(j, "target"),
      .name = at(j, "name"),
      .primerOligonuc = at(j, "primerOligonuc"),
    };
  }

  safe_vector<PcrPrimerCsvRow> parsePcrPrimerCsvRowsStr(const std::string& pcrPrimerCsvRowsStr) {
    const auto j = json::parse(pcrPrimerCsvRowsStr);
    return parseArray<PcrPrimerCsvRow>(j, parsePcrPrimerCsvRow);
  }
}// namespace Nextclade
