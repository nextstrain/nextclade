#include <fmt/format.h>
#include <frozen/algorithm.h>
#include <frozen/string.h>
#include <nextclade/nextclade.h>

#include <array>
#include <boost/algorithm/string/join.hpp>
#include <string>
#include <vector>

#include "../io/formatMutation.h"
#include "../utils/contains.h"

namespace Nextclade {
  namespace {
    template<typename T, typename Formatter, typename Delimiter>
    std::string formatAndJoin(const std::vector<T>& elements, Formatter formatter, Delimiter delimiter) {
      std::vector<std::string> formatted;
      std::transform(elements.cbegin(), elements.cend(), std::back_inserter(formatted), formatter);
      return boost::algorithm::join(formatted, delimiter);
    }

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
  }// namespace

  CsvWriter::CsvWriter(std::ostream& outputStream, const CsvWriterOptions& options)
      : options(options),
        outputStream(outputStream) {
    addHeader();
  }

  std::string CsvWriter::addHeader() {
    constexpr std::array<frozen::string, 41> COLUMN_NAMES = {
      "seqName",
      "clade",
      "qc.overallScore",
      "qc.overallStatus",
      "totalGaps",
      "totalInsertions",
      "totalMissing",
      "totalMutations",
      "totalNonACGTNs",
      "totalPcrPrimerChanges",
      "substitutions",
      "deletions",
      "insertions",
      "missing",
      "nonACGTNs",
      "pcrPrimerChanges",
      "aaSubstitutions",
      "totalAminoacidSubstitutions",
      "aaDeletions",
      "totalAminoacidDeletions",
      "alignmentEnd",
      "alignmentScore",
      "alignmentStart",
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

    std::vector<std::string> columns;
    std::transform(
      COLUMN_NAMES.cbegin(), COLUMN_NAMES.cend(), std::back_inserter(columns), [](const frozen::string& s) {
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

  std::string CsvWriter::addRow(const NextcladeResult& result) {
    std::vector<std::string> columns;

    columns.emplace_back(formatAndJoin(result.substitutions, formatMutation, ","));
    columns.emplace_back(formatAndJoin(result.deletions, formatDeletion, ","));
    columns.emplace_back(formatAndJoin(result.insertions, formatInsertion, ","));

    std::for_each(columns.begin(), columns.end(), maybeSurroundWithQuotes(options.delimiter));
    auto row = boost::algorithm::join(columns, std::string{options.delimiter});
    outputStream << row << "\n";
    return row;
  }
}// namespace Nextclade
