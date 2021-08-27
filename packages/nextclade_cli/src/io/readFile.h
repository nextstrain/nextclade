#pragma once

#include <fstream>
#include <string>

namespace Nextclade {

  class ErrorIoUnableToRead : public ErrorFatal {
  public:
    explicit ErrorIoUnableToRead(const std::string &message) : ErrorFatal(message) {}
  };

  inline std::string readFile(const std::string &filepath) {
    std::ifstream stream(filepath);
    if (!stream.good()) {
      throw ErrorIoUnableToRead(fmt::format("Error: unable to read \"{:s}\"", filepath));
    }
    std::stringstream buffer;
    buffer << stream.rdbuf();
    return buffer.str();
  }

}// namespace Nextclade
