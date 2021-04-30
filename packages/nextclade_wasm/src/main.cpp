#include <emscripten.h>
#include <emscripten/bind.h>
#include <nextclade/nextclade.h>

#include <exception>


emscripten::val getObject() {
  const auto& nextcladeVersion = Nextclade::getVersion();

  auto obj = emscripten::val::object();
  obj.set("foo", 42);// NOLINT(cppcoreguidelines-avoid-magic-numbers)
  obj.set("bar", "Hello");
  obj.set("nextcladeVersion", nextcladeVersion);

  const auto v = std::vector<int>({1, 2, 3});
  const auto arr = emscripten::val::array(v);
  obj.set("arr", arr);

  return obj;
}

std::string getExceptionMessage(std::intptr_t exceptionPtr) {// NOLINT(misc-unused-parameters)
  // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast,cppcoreguidelines-init-variables,performance-no-int-to-ptr)
  const std::exception* e = reinterpret_cast<std::runtime_error*>(exceptionPtr);
  return e->what();
}

std::string convertToString(const emscripten::val& obj) {
  return "Hello";
}

// NOLINTNEXTLINE(cert-err58-cpp,cppcoreguidelines-avoid-non-const-global-variables)
EMSCRIPTEN_BINDINGS(add) {
  emscripten::function("getObject", &getObject);
  emscripten::function("convertToString", &convertToString);
  emscripten::function("getExceptionMessage", &getExceptionMessage);
}
