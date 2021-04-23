#include "formatQcStatus.h"

#include <fmt/format.h>
#include <frozen/map.h>
#include <frozen/string.h>

#include <boost/algorithm/string/join.hpp>

#include "../utils/mapFind.h"

namespace Nextclade {
  namespace {
    constexpr auto qcStatusStrings = frozen::make_map<QcStatus, frozen::string>({
      {QcStatus::good, "good"},
      {QcStatus::mediocre, "mediocre"},
      {QcStatus::bad, "bad"},
    });

    class ErrorQcStatusUnknown : public std::runtime_error {
    public:
      explicit ErrorQcStatusUnknown(const QcStatus& status)
          : std::runtime_error(fmt::format("QC status not recognized: \"{:d}\"", status)) {}
    };
  }// namespace

  std::string formatQcStatus(const QcStatus& status) {
    const auto str = mapFind(qcStatusStrings, status);
    if (!str) {
      throw ErrorQcStatusUnknown(status);
    }
    return std::string{str->data(), str->size()};
  }

  namespace {
    std::string formatQc(const QcResultMissingData& missingData) {
      if (missingData.status == QcStatus::good) {
        return "Good";
      }

      std::string message = "Missing data found'";
      if (missingData.status == QcStatus::bad) {
        message = "Too much missing data found";
      }

      return fmt::format("{}. Total Ns: {} ({} allowed). QC score: {}", message, missingData.totalMissing,
        missingData.missingDataThreshold, std::round(missingData.score));

      return std::string{};
    }

    std::string formatQc(const QcResultPrivateMutations& privateMutations) {
      if (privateMutations.status == QcStatus::good) {
        return "Good";
      }

      std::string message;
      if (privateMutations.status == QcStatus::bad) {
        message = "Too many private mutations. ";
      }

      return fmt::format(
        "{}{} private mutations seen, {} more than expected (more than {} is considered problematic). QC score: {}",
        message, privateMutations.total, privateMutations.excess, privateMutations.cutoff,
        std::round(privateMutations.score));

      return std::string{};
    }

    std::string formatQc(const QCResultMixedSites& mixedSites) {
      if (mixedSites.status == QcStatus::good) {
        return "Good";
      }

      std::string message = "Mixed sites found";

      if (mixedSites.status == QcStatus::bad) {
        message = "Too many mixed sites found";
      }

      return fmt::format("{}: total {} ({} allowed). QC score: {}", message, mixedSites.totalMixedSites,
        mixedSites.mixedSitesThreshold, std::round(mixedSites.score));
    }

    std::string formatQc(const QCResultSnpClusters& snpClusters) {
      if (snpClusters.status == QcStatus::good) {
        return "Good";
      }

      std::string message = "Mutation clusters found";
      if (snpClusters.status == QcStatus::bad) {
        message = "Too many mutation clusters found";
      }

      return fmt::format("{}. Seen {} mutation clusters with total of {} mutations. QC score: {}", message,
        snpClusters.totalSNPs, snpClusters.clusteredSNPs.size(), std::round(snpClusters.score));
    }
  }//namespace

  std::string formatQcFlags(const QcResult& qc) {
    std::vector<std::string> formatted;

    if (qc.missingData) {
      formatted.emplace_back(formatQc(*qc.missingData));
    }

    if (qc.privateMutations) {
      formatted.emplace_back(formatQc(*qc.privateMutations));
    }

    if (qc.mixedSites) {
      formatted.emplace_back(formatQc(*qc.mixedSites));
    }

    if (qc.snpClusters) {
      formatted.emplace_back(formatQc(*qc.snpClusters));
    }

    if (formatted.empty()) {
      return "None";
    }

    return boost::algorithm::join(formatted, "; ");
  }
}// namespace Nextclade
