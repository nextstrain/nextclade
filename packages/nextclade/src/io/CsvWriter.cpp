#include <fmt/format.h>
#include <frozen/algorithm.h>
#include <frozen/string.h>
#include <nextclade/nextclade.h>

#include <array>
#include <boost/algorithm/string/join.hpp>
#include <string>
#include <vector>

#include "../utils/contains.h"
#include "../utils/contract.h"
#include "formatMutation.h"
#include "formatQcStatus.h"

namespace Nextclade {
  namespace {
    auto maybeSurroundWithQuotes(char delimiter) {
      return [delimiter](const std::string& str) {
        constexpr frozen::string CHARS_TO_QUOTE = "\n \"";
        const auto containsQuotable = std::any_of(CHARS_TO_QUOTE.data(),
          CHARS_TO_QUOTE.data() + CHARS_TO_QUOTE.size(),// NOLINT(cppcoreguidelines-pro-bounds-pointer-arithmetic)
          [&str](char c) { return contains(str, c); });

        auto s = std::string{str.data(), str.size()};
        if (contains(s, delimiter) || containsQuotable) {
          return fmt::format("\"{}\"", s);
        }
        return s;
      };
    }

    constexpr std::array<frozen::string, 41> COLUMN_NAMES = {
      "seqName",
      "clade",

      "qc.overallScore",
      "qc.overallStatus",

      "totalSubstitutions",
      "totalDeletions",
      "totalInsertions",
      "totalAminoacidSubstitutions",
      "totalAminoacidDeletions",
      "totalMissing",
      "totalNonACGTNs",
      "totalPcrPrimerChanges",

      "substitutions",
      "deletions",
      "insertions",
      "aaSubstitutions",
      "aaDeletions",
      "missing",
      "nonACGTNs",
      "pcrPrimerChanges",

      "alignmentScore",
      "alignmentStart",
      "alignmentEnd",

      "qc.missingData.missingDataThreshold",
      "qc.missingData.score",
      "qc.missingData.status",
      "qc.missingData.totalMissing",

      "qc.mixedSites.mixedSitesThreshold",
      "qc.mixedSites.score",
      "qc.mixedSites.status",
      "qc.mixedSites.totalMixedSites",

      "qc.privateMutations.cutoff",
      "qc.privateMutations.excess",
      "qc.privateMutations.score",
      "qc.privateMutations.status",
      "qc.privateMutations.total",

      "qc.snpClusters.clusteredSNPs",
      "qc.snpClusters.score",
      "qc.snpClusters.status",
      "qc.snpClusters.totalSNPs",

      "errors",
    };
  }// namespace

  CsvWriter::CsvWriter(std::ostream& out, const CsvWriterOptions& opt) : options(opt), outputStream(out) {
    addHeader();
  }

  std::string CsvWriter::addHeader() {
    std::vector<std::string> columns;
    std::transform(COLUMN_NAMES.cbegin(), COLUMN_NAMES.cend(), std::back_inserter(columns),
      [](const frozen::string& s) {
        return std::string{s.data(), s.size()};
      });
    auto row = prepareRow(columns);
    outputStream << row << "\n";
    return row;
  }

  std::string CsvWriter::prepareRow(const std::vector<std::string>& columns) const {
    std::vector<std::string> columnsQuoted;
    std::transform(columns.begin(), columns.end(), std::inserter(columnsQuoted, columnsQuoted.end()),
      maybeSurroundWithQuotes(options.delimiter));
    const auto rowFrozen = boost::algorithm::join(columnsQuoted, std::string{options.delimiter});
    return std::string{rowFrozen.data(), rowFrozen.size()};
  }

  std::string CsvWriter::addRow(const AnalysisResult& result) {
    std::vector<std::string> columns;

    columns.emplace_back(result.seqName);
    columns.emplace_back(result.clade);

    columns.emplace_back(std::to_string(result.qc.overallScore));
    columns.emplace_back(formatQcStatus(result.qc.overallStatus));

    columns.emplace_back(std::to_string(result.totalSubstitutions));
    columns.emplace_back(std::to_string(result.totalDeletions));
    columns.emplace_back(std::to_string(result.totalInsertions));
    columns.emplace_back(std::to_string(result.totalAminoacidSubstitutions));
    columns.emplace_back(std::to_string(result.totalAminoacidDeletions));
    columns.emplace_back(std::to_string(result.totalMissing));
    columns.emplace_back(std::to_string(result.totalNonACGTNs));
    columns.emplace_back(std::to_string(result.totalPcrPrimerChanges));

    columns.emplace_back(formatAndJoin(result.substitutions, formatMutation, ","));
    columns.emplace_back(formatAndJoin(result.deletions, formatDeletion, ","));
    columns.emplace_back(formatAndJoin(result.insertions, formatInsertion, ","));
    columns.emplace_back(formatAndJoin(result.aaSubstitutions, formatAminoacidMutation, ","));
    columns.emplace_back(formatAndJoin(result.aaDeletions, formatAminoacidDeletion, ","));
    columns.emplace_back(formatAndJoin(result.missing, formatMissing, ","));
    columns.emplace_back(formatAndJoin(result.nonACGTNs, formatNonAcgtn, ","));
    columns.emplace_back(formatAndJoin(result.pcrPrimerChanges, formatPcrPrimerChange, ","));

    columns.emplace_back(std::to_string(result.alignmentScore));
    columns.emplace_back(std::to_string(result.alignmentStart));
    columns.emplace_back(std::to_string(result.alignmentEnd));

    if (result.qc.missingData) {
      columns.emplace_back(std::to_string(result.qc.missingData->missingDataThreshold));
      columns.emplace_back(std::to_string(result.qc.missingData->score));
      columns.emplace_back(formatQcStatus(result.qc.missingData->status));
      columns.emplace_back(std::to_string(result.qc.missingData->totalMissing));
    }

    if (result.qc.mixedSites) {
      columns.emplace_back(std::to_string(result.qc.mixedSites->mixedSitesThreshold));
      columns.emplace_back(std::to_string(result.qc.mixedSites->score));
      columns.emplace_back(formatQcStatus(result.qc.mixedSites->status));
      columns.emplace_back(std::to_string(result.qc.mixedSites->totalMixedSites));
    }

    if (result.qc.privateMutations) {
      columns.emplace_back(std::to_string(result.qc.privateMutations->cutoff));
      columns.emplace_back(std::to_string(result.qc.privateMutations->excess));
      columns.emplace_back(std::to_string(result.qc.privateMutations->score));
      columns.emplace_back(formatQcStatus(result.qc.privateMutations->status));
      columns.emplace_back(std::to_string(result.qc.privateMutations->total));
    }

    if (result.qc.snpClusters) {
      columns.emplace_back(formatAndJoin(result.qc.snpClusters->clusteredSNPs, formatClusteredSnp, ","));
      columns.emplace_back(std::to_string(result.qc.snpClusters->score));
      columns.emplace_back(formatQcStatus(result.qc.snpClusters->status));
      columns.emplace_back(std::to_string(result.qc.snpClusters->totalSNPs));
    }

    std::for_each(columns.begin(), columns.end(), maybeSurroundWithQuotes(options.delimiter));
    auto row = boost::algorithm::join(columns, std::string{options.delimiter});
    outputStream << row << "\n";
    return row;
  }

  std::string CsvWriter::addErrorRow(const std::string& seqName, const std::string& errorFormatted) {
    precondition_greater(COLUMN_NAMES.size(), 2);

    std::vector<std::string> columns{COLUMN_NAMES.size(), ""};
    columns[0] = seqName;
    columns[columns.size() - 1] = errorFormatted;// NOTE: Assumes that the "error" column is the last one

    std::for_each(columns.begin(), columns.end(), maybeSurroundWithQuotes(options.delimiter));
    auto row = boost::algorithm::join(columns, std::string{options.delimiter});
    outputStream << row << "\n";
    return row;
  }

}// namespace Nextclade
