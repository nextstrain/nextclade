#include <common/contract.h>
#include <common/safe_vector.h>
#include <fmt/format.h>
#include <frozen/map.h>
#include <frozen/string.h>
#include <nextclade/nextclade.h>
#include <rapidcsv.h>

#include <array>
#include <boost/algorithm/string/join.hpp>
#include <boost/algorithm/string/replace.hpp>
#include <string>

#include "../utils/at.h"
#include "../utils/concat.h"
#include "../utils/contains.h"
#include "../utils/eraseDuplicates.h"
#include "../utils/safe_cast.h"
#include "formatMutation.h"
#include "formatQcStatus.h"

namespace Nextclade {

  namespace {


    // Lists column names up to and including "clade" column
    inline safe_vector<std::string> getDefaultColumnNamesUpToClades() {
      return safe_vector<std::string>{
        "seqName",
        "clade",
      };
    }

    // Lists column names after "clade" column
    // The separation is needed because we want to put some more dynamic columns between these.
    inline safe_vector<std::string> getDefaultColumnNamesAfterClades() {
      return safe_vector<std::string>{
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
        "privateNucMutations.reversionSubstitutions",
        "privateNucMutations.reversionsOfDeletions",
        "privateNucMutations.labeledSubstitutions",
        "privateNucMutations.labeledDeletions",
        "privateNucMutations.unlabeledSubstitutions",
        "privateNucMutations.unlabeledDeletions",
        "privateNucMutations.totalReversionSubstitutions",
        "privateNucMutations.totalReversionsOfDeletions",
        "privateNucMutations.totalLabeledSubstitutions",
        "privateNucMutations.totalLabeledDeletions",
        "privateNucMutations.totalUnlabeledSubstitutions",
        "privateNucMutations.totalUnlabeledDeletions",

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
        "qc.frameShifts.frameShiftsIgnored",
        "qc.frameShifts.totalFrameShiftsIgnored",

        "qc.frameShifts.score",
        "qc.frameShifts.status",

        "qc.stopCodons.stopCodons",
        "qc.stopCodons.totalStopCodons",
        "qc.stopCodons.score",
        "qc.stopCodons.status",

        "errors",
      };
    }
  }//namespace

  class CSVWriter : public CsvWriterAbstract {
    rapidcsv::Document doc;
    size_t numRows = 1;
    std::map<std::string, int> columnNames;

    int getColumnIndex(const std::string& columnName) {
      return columnNames.at(columnName);
    }

  public:
    explicit CSVWriter(const CsvWriterOptions& opt, const safe_vector<std::string>& customNodeAttrKeys)
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

      // Merge default column names with the incoming custom ones
      auto columnNamesVec = merge(getDefaultColumnNamesUpToClades(), customNodeAttrKeys);
      columnNamesVec = merge(columnNamesVec, getDefaultColumnNamesAfterClades());

      // We want to avoid duplicate column names because std::map cannot have them.
      // The loop below will produce incorrect indices and out-of-bounds errors can happen if there are duplicates.
      eraseDuplicatesUnsortedInPlace(columnNamesVec);

      // Insert headers row and build a map from column name to column index for lookups when writing data rows
      doc.InsertRow<std::string>(0);
      int columnIndex = 0;
      for (const auto& columnName : columnNamesVec) {
        columnNames[columnName] = columnIndex;
        doc.SetCell(columnIndex, 0, columnName);
        ++columnIndex;
      }
    }

    void addRow(const AnalysisResult& result) override {
      const auto& rowName = numRows;
      const auto numColumns = columnNames.size();
      const safe_vector<std::string> rowData(numColumns, "");
      doc.InsertRow<std::string>(numRows, rowData);

      doc.SetCell(getColumnIndex("seqName"), rowName, result.seqName);
      doc.SetCell(getColumnIndex("clade"), rowName, result.clade);

      for (const auto& [key, value] : result.customNodeAttributes) {
        const auto columnIndex = getColumnIndex(key);
        doc.SetCell(columnIndex, rowName, value);
      }

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

      doc.SetCell(getColumnIndex("privateNucMutations.reversionSubstitutions"), rowName,
        formatAndJoin(result.privateNucMutations.reversionSubstitutions, formatMutationSimple, ","));

      doc.SetCell(getColumnIndex("privateNucMutations.reversionsOfDeletions"), rowName,
        formatAndJoin(result.privateNucMutations.reversionsOfDeletions, formatMutationSimple, ","));

      doc.SetCell(getColumnIndex("privateNucMutations.labeledSubstitutions"), rowName,
        formatAndJoin(result.privateNucMutations.labeledSubstitutions, formatMutationSimpleLabeled, ","));

      doc.SetCell(getColumnIndex("privateNucMutations.labeledDeletions"), rowName,
        formatAndJoin(result.privateNucMutations.labeledDeletions, formatDeletionSimpleLabeled, ","));

      doc.SetCell(getColumnIndex("privateNucMutations.unlabeledSubstitutions"), rowName,
        formatAndJoin(result.privateNucMutations.unlabeledSubstitutions, formatMutationSimple, ","));

      doc.SetCell(getColumnIndex("privateNucMutations.unlabeledDeletions"), rowName,
        formatAndJoin(result.privateNucMutations.unlabeledDeletions, formatDeletionSimple, ","));

      doc.SetCell(getColumnIndex("privateNucMutations.totalReversionSubstitutions"), rowName,
        result.privateNucMutations.totalReversionSubstitutions);
      doc.SetCell(getColumnIndex("privateNucMutations.totalReversionsOfDeletions"), rowName,
        result.privateNucMutations.totalReversionsOfDeletions);
      doc.SetCell(getColumnIndex("privateNucMutations.totalLabeledSubstitutions"), rowName,
        result.privateNucMutations.totalLabeledSubstitutions);
      doc.SetCell(getColumnIndex("privateNucMutations.totalLabeledDeletions"), rowName,
        result.privateNucMutations.totalLabeledDeletions);
      doc.SetCell(getColumnIndex("privateNucMutations.totalUnlabeledSubstitutions"), rowName,
        result.privateNucMutations.totalUnlabeledSubstitutions);
      doc.SetCell(getColumnIndex("privateNucMutations.totalUnlabeledDeletions"), rowName,
        result.privateNucMutations.totalUnlabeledDeletions);

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
          std::to_string(result.qc.privateMutations->weightedTotal));
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
      doc.SetCell(getColumnIndex("seqName"), numRows, seqName);
      doc.SetCell(getColumnIndex("errors"), numRows, errorFormatted);
      ++numRows;
    }

    void write(std::ostream& outputStream) override {
      doc.Save(outputStream);
    }
  };


  std::unique_ptr<CsvWriterAbstract> createCsvWriter(const CsvWriterOptions& options,
    const safe_vector<std::string>& customNodeAttrKeys) {
    return std::make_unique<CSVWriter>(options, customNodeAttrKeys);
  }

}// namespace Nextclade
