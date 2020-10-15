#include <string>
#include <exception>
#include <iostream>

#include <emscripten.h>
#include <emscripten/bind.h>

#include <boost/stacktrace.hpp>

int add(int x, int y) {
  return x + y;
}

std::string concat(const std::string& x, const std::string& y) {
  return x + y;
}

void kaboom() {
  throw std::runtime_error("Error: in " + std::string(__FILE__) + ":" + std::to_string(__LINE__) + ": kaboom!");
}

std::string getExceptionMessage(std::intptr_t exceptionPtr) {
  const std::exception* e = reinterpret_cast<std::runtime_error*>(exceptionPtr);
  return e->what();
}

EMSCRIPTEN_BINDINGS(add) {
  emscripten::function("add", &add);
  emscripten::function("concat", &concat);
  emscripten::function("kaboom", &kaboom);
  emscripten::function("getExceptionMessage", &getExceptionMessage);
}
