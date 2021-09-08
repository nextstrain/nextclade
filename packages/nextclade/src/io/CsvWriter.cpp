#include <fmt/format.h>
#include <frozen/string.h>
#include <nextclade/nextclade.h>

#include <array>
#include <boost/algorithm/string/join.hpp>
#include <boost/algorithm/string/replace.hpp>
#include <string>
#include <vector>

#include "../utils/contains.h"
#include "../utils/contract.h"
#include "formatMutation.h"
#include "formatQcStatus.h"

namespace Nextclade {
  namespace {
    template<typename Func>
    void repeat(int times, Func f) {
      while (times > 0) {
        f();
        times--;
      }
    }

    auto maybeSurroundWithQuotes(char delimiter) {
      return [delimiter](const std::string& str) {
        constexpr frozen::string CHARS_TO_QUOTE = "\r\n \"";
        const auto containsQuotable = std::any_of(CHARS_TO_QUOTE.data(),
          CHARS_TO_QUOTE.data() + CHARS_TO_QUOTE.size(),// NOLINT(cppcoreguidelines-pro-bounds-pointer-arithmetic)
          [&str](char c) { return contains(str, c); });

        if (contains(str, delimiter) || containsQuotable) {
          return fmt::format("\"{}\"", str);
        }
        return str;
      };
    }

    constexpr frozen::string NEWLINE = "\r\n";

    constexpr std::array<frozen::string, 51> COLUMN_NAMES = {
      "seqName",
      "clade",

      "qc.overallScore",
      "qc.overallStatus",

      "totalSubstitutions",
      "totalDeletions",
      "totalInsertions",
      "totalFrameShifts",
      "totalAminoacidSubstitutions",
      "totalAminoacidDeletions",
      "totalMissing",
      "totalNonACGTNs",
      "totalPcrPrimerChanges",

      "substitutions",
      "deletions",
      "insertions",
      "frameShifts",
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

      "qc.frameShifts.frameShifts",
      "qc.frameShifts.totalFrameShifts",
      "qc.frameShifts.score",
      "qc.frameShifts.status",

      "qc.stopCodons.stopCodons",
      "qc.stopCodons.totalStopCodons",
      "qc.stopCodons.score",
      "qc.stopCodons.status",

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
    outputStream << row << NEWLINE.data();
    return row;
  }

  std::string CsvWriter::prepareRow(const std::vector<std::string>& columns) const {
    std::vector<std::string> columnsEscaped;
    std::transform(columns.cbegin(), columns.cend(), std::inserter(columnsEscaped, columnsEscaped.end()),
      [](const std::string& column) { return boost::replace_all_copy(column, "\"", "\"\""); });

    std::vector<std::string> columnsQuoted;
    std::transform(columnsEscaped.cbegin(), columnsEscaped.cend(), std::inserter(columnsQuoted, columnsQuoted.end()),
      maybeSurroundWithQuotes(options.delimiter));

    auto row = boost::algorithm::join(columnsQuoted, std::string{options.delimiter});
    return std::string{row.data(), row.size()};
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
    columns.emplace_back(std::to_string(result.totalFrameShifts));
    columns.emplace_back(std::to_string(result.totalAminoacidSubstitutions));
    columns.emplace_back(std::to_string(result.totalAminoacidDeletions));
    columns.emplace_back(std::to_string(result.totalMissing));
    columns.emplace_back(std::to_string(result.totalNonACGTNs));
    columns.emplace_back(std::to_string(result.totalPcrPrimerChanges));

    columns.emplace_back(formatAndJoin(result.substitutions, formatMutation, ","));
    columns.emplace_back(formatAndJoin(result.deletions, formatDeletion, ","));
    columns.emplace_back(formatAndJoin(result.insertions, formatInsertion, ","));
    columns.emplace_back(formatAndJoin(result.frameShifts, formatFrameShift, ","));
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
    } else {
      repeat(4, [&columns]() { columns.emplace_back(""); });
    }

    if (result.qc.mixedSites) {
      columns.emplace_back(std::to_string(result.qc.mixedSites->mixedSitesThreshold));
      columns.emplace_back(std::to_string(result.qc.mixedSites->score));
      columns.emplace_back(formatQcStatus(result.qc.mixedSites->status));
      columns.emplace_back(std::to_string(result.qc.mixedSites->totalMixedSites));
    } else {
      repeat(4, [&columns]() { columns.emplace_back(""); });
    }

    if (result.qc.privateMutations) {
      columns.emplace_back(std::to_string(result.qc.privateMutations->cutoff));
      columns.emplace_back(std::to_string(result.qc.privateMutations->excess));
      columns.emplace_back(std::to_string(result.qc.privateMutations->score));
      columns.emplace_back(formatQcStatus(result.qc.privateMutations->status));
      columns.emplace_back(std::to_string(result.qc.privateMutations->total));
    } else {
      repeat(5, [&columns]() { columns.emplace_back(""); });// NOLINT(cppcoreguidelines-avoid-magic-numbers)
    }

    if (result.qc.snpClusters) {
      columns.emplace_back(formatAndJoin(result.qc.snpClusters->clusteredSNPs, formatClusteredSnp, ","));
      columns.emplace_back(std::to_string(result.qc.snpClusters->score));
      columns.emplace_back(formatQcStatus(result.qc.snpClusters->status));
      columns.emplace_back(std::to_string(result.qc.snpClusters->totalSNPs));
    } else {
      repeat(4, [&columns]() { columns.emplace_back(""); });
    }

    if (result.qc.frameShifts) {
      columns.emplace_back(formatAndJoin(result.qc.frameShifts->frameShifts, formatFrameShift, ","));
      columns.emplace_back(std::to_string(result.qc.frameShifts->totalFrameShifts));
      columns.emplace_back(std::to_string(result.qc.frameShifts->score));
      columns.emplace_back(formatQcStatus(result.qc.frameShifts->status));
    } else {
      repeat(4, [&columns]() { columns.emplace_back(""); });
    }

    if (result.qc.stopCodons) {
      columns.emplace_back(formatAndJoin(result.qc.stopCodons->stopCodons, formatStopCodon, ","));
      columns.emplace_back(std::to_string(result.qc.stopCodons->totalStopCodons));
      columns.emplace_back(std::to_string(result.qc.stopCodons->score));
      columns.emplace_back(formatQcStatus(result.qc.stopCodons->status));
    } else {
      repeat(4, [&columns]() { columns.emplace_back(""); });
    }

    auto row = prepareRow(columns);
    outputStream << row << NEWLINE.data();
    return row;
  }

  std::string CsvWriter::addErrorRow(const std::string& seqName, const std::string& errorFormatted) {
    precondition_greater(COLUMN_NAMES.size(), 2);

    std::vector<std::string> columns{COLUMN_NAMES.size(), ""};
    columns[0] = seqName;
    columns[columns.size() - 1] = errorFormatted;// NOTE: Assumes that the "error" column is the last one

    auto row = prepareRow(columns);
    outputStream << row << NEWLINE.data();
    return row;
  }

}// namespace Nextclade
