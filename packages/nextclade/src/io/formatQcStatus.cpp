#include "formatQcStatus.h"

#include <fmt/format.h>
#include <frozen/string.h>// NOLINT(modernize-deprecated-headers) /* false positive */

#include <boost/algorithm/string/join.hpp>

#include "../utils/mapFind.h"

namespace Nextclade {
  namespace {
    class ErrorQcStatusUnknown : public ErrorNonFatal {
    public:
      explicit ErrorQcStatusUnknown(const QcStatus& status)
          : ErrorNonFatal(fmt::format("QC status not recognized: \"{:d}\"", status)) {}
    };


    class ErrorAnalysisResultsQcStatusInvalid : public ErrorNonFatal {
    public:
      explicit ErrorAnalysisResultsQcStatusInvalid(const std::string& statusStr)
          : ErrorNonFatal(fmt::format("QC status not recognized: \"{:s}\"", statusStr)) {}
    };

  }// namespace

  std::string formatQcStatus(const QcStatus& status) {
    const auto str = mapFind(qcStatusStrings, status);
    if (!str) {
      throw ErrorQcStatusUnknown(status);
    }
    return std::string{str->data(), str->size()};
  }

  QcStatus parseQcStatus(const frozen::string& statusStr) {
    const auto status = mapFind(qcStringsStatus, statusStr);
    if (!status) {
      throw ErrorAnalysisResultsQcStatusInvalid(statusStr.data());
    }
    return *status;
  }
}// namespace Nextclade
