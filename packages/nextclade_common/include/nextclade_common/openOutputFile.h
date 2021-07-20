#pragma once

#include <nextclade_common/filesystem.h>

#include <fstream>
#include <memory>
#include <string>

namespace Nextclade {

  class ErrorIoUnableToWrite : public std::runtime_error {
  public:
    inline explicit ErrorIoUnableToWrite(const std::string &message) : std::runtime_error(message) {}
  };

  /**
 * Opens a file stream given filepath and creates target directory tree if does not exist
 */
  inline void openOutputFile(const std::string &filepath, std::ofstream &stream) {
    const auto outputJsonParent = fs::path(filepath).parent_path();
    if (!outputJsonParent.empty()) {
      fs::create_directories(outputJsonParent);
    }

    stream.open(filepath);
    if (!stream.is_open()) {
      throw ErrorIoUnableToWrite(fmt::format("Error: unable to write \"{:s}\": {:s}", filepath, strerror(errno)));
    }
  }

  /**
 * Opens a file stream, if the given optional filepath contains value, returns nullptr otherwise
 */
  inline std::unique_ptr<std::ostream> openOutputFileMaybe(const std::optional<std::string> &filepath) {
    if (!filepath) {
      return nullptr;
    }

    const auto outputJsonParent = fs::path(*filepath).parent_path();
    if (!outputJsonParent.empty()) {
      fs::create_directories(outputJsonParent);
    }

    auto stream = std::make_unique<std::ofstream>(*filepath);
    if (!stream->is_open()) {
      throw ErrorIoUnableToWrite(fmt::format("Error: unable to write \"{:s}\": {:s}", *filepath, strerror(errno)));
    }

    return stream;
  }
}// namespace Nextclade
