#include "formatQcStatus.h"

#include <fmt/format.h>
#include <frozen/map.h>
#include <frozen/string.h>

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
}// namespace Nextclade
