#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>
#include <utils/mapFind.h>

#include <nlohmann/json.hpp>
#include <string>
#include <vector>

#include "formatQcStatus.h"

namespace Nextclade {
  using json = nlohmann::ordered_json;
  using json_pointer = json::json_pointer;

  class ErrorAnalysisResultsKeyNotFound : public ErrorNonFatal {
  public:
    explicit ErrorAnalysisResultsKeyNotFound(const std::string& key)
        : ErrorNonFatal(fmt::format("When parsing analysis results JSON: key not found: \"{:s}\"", key)) {}
  };

  class ErrorAnalysisResultsRootTypeInvalid : public ErrorNonFatal {
  public:
    explicit ErrorAnalysisResultsRootTypeInvalid(const std::string& type)
        : ErrorNonFatal(fmt::format(
            "When parsing analysis results JSON: Expected to find an array as the root entry, but found \"{:s}\"",
            type)) {}
  };

  class ErrorAnalysisResultsTypeInvalid : public ErrorNonFatal {
  public:
    explicit ErrorAnalysisResultsTypeInvalid(const std::string& key, const std::string& typeExpected,
      const std::string& typeActual)
        : ErrorNonFatal(fmt::format("When parsing analysis results JSON: When parsing property \"{:s}\": Expected "
                                    "to find \"{:s}\", but found \"{:s}\"",
            key, typeExpected, typeActual)) {}
  };

  class ErrorAnalysisResultsQcStatusInvalid : public ErrorNonFatal {
  public:
    explicit ErrorAnalysisResultsQcStatusInvalid(const std::string& statusStr)
        : ErrorNonFatal(
            fmt::format("When parsing analysis results JSON: QC status not recognized: \"{:s}\"", statusStr)) {}
  };

  const json& at(const json& j, const std::string& key) {
    if (!j.is_object()) {
      throw ErrorAnalysisResultsKeyNotFound(key);
    }

    if (!j.contains(key)) {
      throw ErrorAnalysisResultsKeyNotFound(key);
    }

    return j[key];
  }

  template<typename T, typename Parser = std::function<T(const json&)>>
  std::vector<T> parseArray(const json& arr, const Parser& parser) {
    std::vector<T> vec;

    for (const auto& elem : arr) {
      vec.push_back(parser(elem));
    }
    return vec;
  }
  template<typename T, typename Parser = std::function<T(const json&)>>
  std::vector<T> parseArray(const json& obj, const std::string& key, const Parser& parser) {
    const auto& arr = at(obj, key);
    if (!arr.is_array()) {
      throw ErrorAnalysisResultsTypeInvalid(key, "array", arr.type_name());
    }
    return parseArray<T>(arr, parser);
  }


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
      .refAA = stringToAa(at(j, "refAA")),
      .codon = at(j, "codon").get<int>(),
      .queryAA = stringToAa(at(j, "queryAA")),
      .codonNucRange = parseRange(at(j, "codonNucRange")),
      .refContext = toNucleotideSequence(at(j, "refContext")),
      .queryContext = toNucleotideSequence(at(j, "queryContext")),
      .contextNucRange = parseRange(at(j, "contextNucRange")),
    };
  }

  AminoacidDeletion parseAminoacidDeletion(const json& j) {
    return AminoacidDeletion{
      .gene = at(j, "gene"),
      .refAA = stringToAa(at(j, "refAA")),
      .codon = at(j, "codon").get<int>(),
      .codonNucRange = parseRange(at(j, "codonNucRange")),
      .refContext = toNucleotideSequence(at(j, "refContext")),
      .queryContext = toNucleotideSequence(at(j, "queryContext")),
      .contextNucRange = parseRange(at(j, "contextNucRange")),
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
      .refNuc = stringToNuc(at(j, "refNuc")),
      .pos = at(j, "pos").get<int>(),
      .queryNuc = stringToNuc(at(j, "queryNuc")),
      .pcrPrimersChanged = parseArray<PcrPrimer>(j, "pcrPrimersChanged", parsePcrPrimer),
      .aaSubstitutions = {},
    };
  }

  NucleotideDeletion parseNucleotideDeletion(const json& j) {
    return NucleotideDeletion{
      .start = at(j, "start").get<int>(),
      .length = at(j, "length").get<int>(),
    };
  }

  NucleotideInsertion parseNucleotideInsertion(const json& j) {
    return NucleotideInsertion{
      .pos = at(j, "pos").get<int>(),
      .length = at(j, "length").get<int>(),
      .ins = toNucleotideSequence(at(j, "ins")),
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

  int parseInt(const json& j, const std::string& key) {
    const auto& val = at(j, key);
    if (!val.is_number_integer()) {
      auto typeName = std::string{val.type_name()};
      if (typeName == std::string{"number"}) {
        typeName = "floating-point number";
      }
      throw ErrorAnalysisResultsTypeInvalid(key, "integer", typeName);
    }
    return val.get<int>();
  }

  double parseDouble(const json& j, const std::string& key) {
    const auto& val = at(j, key);
    if (!val.is_number()) {
      throw ErrorAnalysisResultsTypeInvalid(key, "number", val.type_name());
    }
    return val.get<double>();
  }

  QcStatus parseQcStatus(const frozen::string& statusStr) {
    const auto status = mapFind(qcStringsStatus, statusStr);
    if (!status) {
      throw ErrorAnalysisResultsQcStatusInvalid(statusStr.data());
    }
    return *status;
  }

  std::optional<QcResultMissingData> parseQcMissingData(const json& j) {
    return QcResultMissingData{
      .score = parseDouble(j, "score"),
      .status = parseQcStatus(frozen::string{j["status"].get<std::string>()}),
      .totalMissing = parseInt(j, "totalMissing"),
      .missingDataThreshold = parseDouble(j, "missingDataThreshold"),
    };
  }

  std::optional<QCResultMixedSites> parseQcMixedSites(const json& j) {
    return QCResultMixedSites{
      .score = parseDouble(j, "score"),
      .status = parseQcStatus(frozen::string{j["status"].get<std::string>()}),
      .totalMixedSites = parseInt(j, "totalMixedSites"),
      .mixedSitesThreshold = parseDouble(j, "mixedSitesThreshold"),
    };
  }

  std::optional<QcResultPrivateMutations> parseQcPrivateMutations(const json& j) {
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

  std::optional<QCResultSnpClusters> parseQcSnpClusters(const json& j) {
    return QCResultSnpClusters{
      .score = parseDouble(j, "score"),
      .status = parseQcStatus(frozen::string{j["status"].get<std::string>()}),
      .totalSNPs = parseInt(j, "totalSNPs"),
      .clusteredSNPs = parseArray<ClusteredSnp>(j, "clusteredSNPs", parseClusteredSnp),
    };
  }

  QcResult parseQcResult(const json& j) {
    return QcResult{
      .missingData = parseQcMissingData(at(j, "missingData")),
      .mixedSites = parseQcMixedSites(at(j, "mixedSites")),
      .privateMutations = parseQcPrivateMutations(at(j, "privateMutations")),
      .snpClusters = parseQcSnpClusters(at(j, "snpClusters")),
      .overallScore = parseDouble(j, "overallScore"),
      .overallStatus = parseQcStatus(frozen::string{j["overallStatus"].get<std::string>()}),
    };
  }

  AnalysisResult parseAnalysisResult(const json& j) {
    return AnalysisResult{
      .seqName = at(j, "seqName").get<std::string>(),
      .substitutions = parseArray<NucleotideSubstitution>(j, "substitutions", parseNucleotideSubstitution),
      .totalSubstitutions = at(j, "totalSubstitutions"),
      .deletions = parseArray<NucleotideDeletion>(j, "deletions", parseNucleotideDeletion),
      .totalDeletions = at(j, "totalDeletions"),
      .insertions = parseArray<NucleotideInsertion>(j, "insertions", parseNucleotideInsertion),
      .totalInsertions = at(j, "totalInsertions"),
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
      .qc = parseQcResult(at(j, "qc")),
    };
  }

  std::vector<Nextclade::AnalysisResult> parseAnalysisResults(const std::string& analysisResultsStr) {
    const auto j = json::parse(analysisResultsStr);
    if (!j.is_array()) {
      throw ErrorAnalysisResultsRootTypeInvalid(j.type_name());
    }
    return parseArray<AnalysisResult>(j, parseAnalysisResult);
  }

  PcrPrimerCsvRow parsePcrPrimerCsvRow(const json& j) {
    return PcrPrimerCsvRow{
      .source = at(j, "source"),
      .target = at(j, "target"),
      .name = at(j, "name"),
      .primerOligonuc = at(j, "primerOligonuc"),
    };
  }

  std::vector<PcrPrimerCsvRow> parsePcrPrimerCsvRowsStr(const std::string& pcrPrimerCsvRowsStr) {
    const auto j = json::parse(pcrPrimerCsvRowsStr);
    return parseArray<PcrPrimerCsvRow>(j, parsePcrPrimerCsvRow);
  }
}// namespace Nextclade
