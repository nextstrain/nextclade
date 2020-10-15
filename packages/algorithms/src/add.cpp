#include "add.h"

#include <exception>
#include <string>

class WasmErrorImpl : public std::exception {
  const std::string message;

public:
  WasmErrorImpl(const std::string& file, int line, const std::string& function, const std::string& message)
      : message(std::string("Error: ") + typeid(this).name() + ": in " + file + ":" + std::to_string(line) +
                ": in function: " + function + ": " + message) {}

  [[nodiscard]] const char* what() const noexcept override {
    return message.c_str();
  }
};

// clang-format off
#define WasmError(message) WasmErrorImpl(__FILE__, __LINE__, __PRETTY_FUNCTION__, #message) // NOLINT(cppcoreguidelines-macro-usage,cppcoreguidelines-pro-bounds-array-to-pointer-decay)
// clang-format on

int add(int x, int y) {
  return x + y;
}

std::string concat(const std::string& x, const std::string& y) {
  return x + y;
}


void kaboom() {
  throw WasmError("kaboom!");
}
