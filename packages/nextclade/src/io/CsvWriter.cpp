#include <fmt/format.h>
#include <frozen/map.h>
#include <frozen/string.h>
#include <nextclade/nextclade.h>
#include <rapidcsv.h>

#include <array>
#include <boost/algorithm/string/join.hpp>
#include <boost/algorithm/string/replace.hpp>
#include <string>
#include <vector>

#include "../utils/at.h"
#include "../utils/contains.h"
#include "../utils/contract.h"
#include "../utils/safe_cast.h"
#include "formatMutation.h"
#include "formatQcStatus.h"

namespace Nextclade {

  namespace {
    constexpr auto COLUMN_NAMES = frozen::make_map<frozen::string, int>({
      {"seqName", 0},
      {"clade", 1},

      {"qc.overallScore", 2},
      {"qc.overallStatus", 3},

      {"totalSubstitutions", 4},
      {"totalDeletions", 5},
      {"totalInsertions", 6},
      {"totalFrameShifts", 7},
      {"totalAminoacidSubstitutions", 8},
      {"totalAminoacidDeletions", 9},
      {"totalMissing", 10},
      {"totalNonACGTNs", 11},
      {"totalPcrPrimerChanges", 12},

      {"substitutions", 13},
      {"deletions", 14},
      {"insertions", 15},
      {"frameShifts", 16},
      {"aaSubstitutions", 17},
      {"aaDeletions", 18},
      {"missing", 19},
      {"nonACGTNs", 20},
      {"pcrPrimerChanges", 21},

      {"alignmentScore", 22},
      {"alignmentStart", 23},
      {"alignmentEnd", 24},

      {"qc.missingData.missingDataThreshold", 25},
      {"qc.missingData.score", 26},
      {"qc.missingData.status", 27},
      {"qc.missingData.totalMissing", 28},

      {"qc.mixedSites.mixedSitesThreshold", 29},
      {"qc.mixedSites.score", 30},
      {"qc.mixedSites.status", 31},
      {"qc.mixedSites.totalMixedSites", 32},

      {"qc.privateMutations.cutoff", 33},
      {"qc.privateMutations.excess", 34},
      {"qc.privateMutations.score", 35},
      {"qc.privateMutations.status", 36},
      {"qc.privateMutations.total", 37},

      {"qc.snpClusters.clusteredSNPs", 38},
      {"qc.snpClusters.score", 39},
      {"qc.snpClusters.status", 40},
      {"qc.snpClusters.totalSNPs", 41},

      {"qc.frameShifts.frameShifts", 42},
      {"qc.frameShifts.totalFrameShifts", 43},
      {"qc.frameShifts.frameShiftsIgnored", 44},
      {"qc.frameShifts.totalFrameShiftsIgnored", 45},

      {"qc.frameShifts.score", 46},
      {"qc.frameShifts.status", 47},

      {"qc.stopCodons.stopCodons", 48},
      {"qc.stopCodons.totalStopCodons", 49},
      {"qc.stopCodons.score", 50},
      {"qc.stopCodons.status", 51},

      {"errors", 52},
    });
  }//namespace

  int getColumnIndex(const std::string& columnName) {
    const auto name = frozen::string{columnName};
    const auto index = COLUMN_NAMES.at(name);
    return index;
  }

  class CSVWriter : public CsvWriterAbstract {
    rapidcsv::Document doc;
    size_t numRows = 1;

  public:
    explicit CSVWriter(const CsvWriterOptions& opt)
        : doc{
            "",
            rapidcsv::LabelParams{/* pColumnNameIdx */ -1, /* pRowNameIdx */ -1},
            rapidcsv::SeparatorParams{
              /* pSeparator */ opt.delimiter,//
              /* pTrim */ false,             //
              /* pHasCR */ true,             //
              /* pQuotedLinebreaks */ false, //
              /* pAutoQuote */ true          //
            },
            rapidcsv::ConverterParams{},
            rapidcsv::LineReaderParams{
              /* pSkipCommentLines */ true,//
              /* pCommentPrefix */ '#',    //
              /* pSkipEmptyLines  */ true  //
            },

          } {

      doc.InsertRow<std::string>(0);
      for (const auto& column : COLUMN_NAMES) {
        const auto& [name, i] = column;
        const auto columnIndex = safe_cast<size_t>(i);
        const auto& columnName = std::string{name.data()};
        doc.SetCell(columnIndex, 0, columnName);
      }
    }

    void addRow(const AnalysisResult& result) override {
      const auto& rowName = numRows;
      const std::vector<std::string> rowData(COLUMN_NAMES.size(), "");
      doc.InsertRow<std::string>(numRows, rowData);

      doc.SetCell(getColumnIndex("seqName"), rowName, result.seqName);
      doc.SetCell(getColumnIndex("clade"), rowName, result.clade);

      doc.SetCell(getColumnIndex("qc.overallScore"), rowName, std::to_string(result.qc.overallScore));
      doc.SetCell(getColumnIndex("qc.overallStatus"), rowName, formatQcStatus(result.qc.overallStatus));

      doc.SetCell(getColumnIndex("totalSubstitutions"), rowName, std::to_string(result.totalSubstitutions));
      doc.SetCell(getColumnIndex("totalDeletions"), rowName, std::to_string(result.totalDeletions));
      doc.SetCell(getColumnIndex("totalInsertions"), rowName, std::to_string(result.totalInsertions));
      doc.SetCell(getColumnIndex("totalFrameShifts"), rowName, std::to_string(result.totalFrameShifts));
      doc.SetCell(getColumnIndex("totalAminoacidSubstitutions"), rowName,
        std::to_string(result.totalAminoacidSubstitutions));
      doc.SetCell(getColumnIndex("totalAminoacidDeletions"), rowName, std::to_string(result.totalAminoacidDeletions));
      doc.SetCell(getColumnIndex("totalMissing"), rowName, std::to_string(result.totalMissing));
      doc.SetCell(getColumnIndex("totalNonACGTNs"), rowName, std::to_string(result.totalNonACGTNs));
      doc.SetCell(getColumnIndex("totalPcrPrimerChanges"), rowName, std::to_string(result.totalPcrPrimerChanges));

      doc.SetCell(getColumnIndex("substitutions"), rowName, formatAndJoin(result.substitutions, formatMutation, ","));
      doc.SetCell(getColumnIndex("deletions"), rowName, formatAndJoin(result.deletions, formatDeletion, ","));
      doc.SetCell(getColumnIndex("insertions"), rowName, formatAndJoin(result.insertions, formatInsertion, ","));
      doc.SetCell(getColumnIndex("frameShifts"), rowName, formatAndJoin(result.frameShifts, formatFrameShift, ","));
      doc.SetCell(getColumnIndex("aaSubstitutions"), rowName,
        formatAndJoin(result.aaSubstitutions, formatAminoacidMutation, ","));
      doc.SetCell(getColumnIndex("aaDeletions"), rowName,
        formatAndJoin(result.aaDeletions, formatAminoacidDeletion, ","));
      doc.SetCell(getColumnIndex("missing"), rowName, formatAndJoin(result.missing, formatMissing, ","));
      doc.SetCell(getColumnIndex("nonACGTNs"), rowName, formatAndJoin(result.nonACGTNs, formatNonAcgtn, ","));
      doc.SetCell(getColumnIndex("pcrPrimerChanges"), rowName,
        formatAndJoin(result.pcrPrimerChanges, formatPcrPrimerChange, ","));

      doc.SetCell(getColumnIndex("alignmentScore"), rowName, std::to_string(result.alignmentScore));
      doc.SetCell(getColumnIndex("alignmentStart"), rowName, std::to_string(result.alignmentStart));
      doc.SetCell(getColumnIndex("alignmentEnd"), rowName, std::to_string(result.alignmentEnd));

      if (result.qc.missingData) {
        doc.SetCell(getColumnIndex("qc.missingData.missingDataThreshold"), rowName,
          std::to_string(result.qc.missingData->missingDataThreshold));
        doc.SetCell(getColumnIndex("qc.missingData.score"), rowName, std::to_string(result.qc.missingData->score));
        doc.SetCell(getColumnIndex("qc.missingData.status"), rowName, formatQcStatus(result.qc.missingData->status));
        doc.SetCell(getColumnIndex("qc.missingData.totalMissing"), rowName,
          std::to_string(result.qc.missingData->totalMissing));
      }

      if (result.qc.mixedSites) {
        doc.SetCell(getColumnIndex("qc.mixedSites.mixedSitesThreshold"), rowName,
          std::to_string(result.qc.mixedSites->mixedSitesThreshold));
        doc.SetCell(getColumnIndex("qc.mixedSites.score"), rowName, std::to_string(result.qc.mixedSites->score));
        doc.SetCell(getColumnIndex("qc.mixedSites.status"), rowName, formatQcStatus(result.qc.mixedSites->status));
        doc.SetCell(getColumnIndex("qc.mixedSites.totalMixedSites"), rowName,
          std::to_string(result.qc.mixedSites->totalMixedSites));
      }

      if (result.qc.privateMutations) {
        doc.SetCell(getColumnIndex("qc.privateMutations.cutoff"), rowName,
          std::to_string(result.qc.privateMutations->cutoff));
        doc.SetCell(getColumnIndex("qc.privateMutations.excess"), rowName,
          std::to_string(result.qc.privateMutations->excess));
        doc.SetCell(getColumnIndex("qc.privateMutations.score"), rowName,
          std::to_string(result.qc.privateMutations->score));
        doc.SetCell(getColumnIndex("qc.privateMutations.status"), rowName,
          formatQcStatus(result.qc.privateMutations->status));
        doc.SetCell(getColumnIndex("qc.privateMutations.total"), rowName,
          std::to_string(result.qc.privateMutations->total));
      }

      if (result.qc.snpClusters) {
        doc.SetCell(getColumnIndex("qc.snpClusters.clusteredSNPs"), rowName,
          formatAndJoin(result.qc.snpClusters->clusteredSNPs, formatClusteredSnp, ","));
        doc.SetCell(getColumnIndex("qc.snpClusters.score"), rowName, std::to_string(result.qc.snpClusters->score));
        doc.SetCell(getColumnIndex("qc.snpClusters.status"), rowName, formatQcStatus(result.qc.snpClusters->status));
        doc.SetCell(getColumnIndex("qc.snpClusters.totalSNPs"), rowName,
          std::to_string(result.qc.snpClusters->totalSNPs));
      }

      if (result.qc.frameShifts) {
        doc.SetCell(getColumnIndex("qc.frameShifts.frameShifts"), rowName,
          formatAndJoin(result.qc.frameShifts->frameShifts, formatFrameShift, ","));
        doc.SetCell(getColumnIndex("qc.frameShifts.totalFrameShifts"), rowName,
          std::to_string(result.qc.frameShifts->totalFrameShifts));
        doc.SetCell(getColumnIndex("qc.frameShifts.frameShiftsIgnored"), rowName,
          formatAndJoin(result.qc.frameShifts->frameShiftsIgnored, formatFrameShift, ","));
        doc.SetCell(getColumnIndex("qc.frameShifts.totalFrameShiftsIgnored"), rowName,
          std::to_string(result.qc.frameShifts->totalFrameShiftsIgnored));
        doc.SetCell(getColumnIndex("qc.frameShifts.score"), rowName, std::to_string(result.qc.frameShifts->score));
        doc.SetCell(getColumnIndex("qc.frameShifts.status"), rowName, formatQcStatus(result.qc.frameShifts->status));
      }

      if (result.qc.stopCodons) {
        doc.SetCell(getColumnIndex("qc.stopCodons.stopCodons"), rowName,
          formatAndJoin(result.qc.stopCodons->stopCodons, formatStopCodon, ","));
        doc.SetCell(getColumnIndex("qc.stopCodons.totalStopCodons"), rowName,
          std::to_string(result.qc.stopCodons->totalStopCodons));
        doc.SetCell(getColumnIndex("qc.stopCodons.score"), rowName, std::to_string(result.qc.stopCodons->score));
        doc.SetCell(getColumnIndex("qc.stopCodons.status"), rowName, formatQcStatus(result.qc.stopCodons->status));
      }

      ++numRows;
    }

    void addErrorRow(const std::string& seqName, const std::string& errorFormatted) override {
      const auto& rowIndex = numRows;
      doc.SetCell(getColumnIndex("seqName"), numRows, seqName);
      doc.SetCell(getColumnIndex("errors"), numRows, errorFormatted);
      ++numRows;
    }

    void write(std::ostream& outputStream) override {
      doc.Save(outputStream);
    }
  };


  std::unique_ptr<CsvWriterAbstract> createCsvWriter(const CsvWriterOptions& options) {
    return std::make_unique<CSVWriter>(options);
  }

}// namespace Nextclade
