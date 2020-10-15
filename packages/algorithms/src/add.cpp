#include <emscripten/bind.h>

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

emscripten::val getObject() {
  auto obj = emscripten::val::object();
  obj.set("foo", 42);// NOLINT(cppcoreguidelines-avoid-magic-numbers)
  obj.set("bar", "Hello");

  const auto v = std::vector<int>({1, 2, 3});
  const auto arr = emscripten::val::array(v);
  obj.set("arr", arr);

  return obj;
}

void kaboom() {
  throw WasmError("kaboom!");
}

std::string getExceptionMessage(std::intptr_t exceptionPtr) {// NOLINT(misc-unused-parameters)
  // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast,cppcoreguidelines-init-variables)
  const std::exception* e = reinterpret_cast<std::runtime_error*>(exceptionPtr);
  return e->what();
}

// NOLINTNEXTLINE(cert-err58-cpp,cppcoreguidelines-avoid-non-const-global-variables)
EMSCRIPTEN_BINDINGS(add) {
  emscripten::function("add", &add);
  emscripten::function("concat", &concat);
  emscripten::function("getObject", &getObject);
  emscripten::function("kaboom", &kaboom);
  emscripten::function("getExceptionMessage", &getExceptionMessage);
}
