#include <emscripten/bind.h>

#include <exception>
#include <string>

#include "add.h"
#include "bbb.h"

emscripten::val getObject() {
  auto obj = emscripten::val::object();
  obj.set("foo", 42);// NOLINT(cppcoreguidelines-avoid-magic-numbers)
  obj.set("bar", "Hello");

  const auto v = std::vector<int>({1, 2, 3});
  const auto arr = emscripten::val::array(v);
  obj.set("arr", arr);

  return obj;
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

// NOLINTNEXTLINE(cert-err58-cpp,cppcoreguidelines-avoid-non-const-global-variables)
EMSCRIPTEN_BINDINGS(bbb) {
  emscripten::value_object<Foo>("Foo").field("bar", &Foo::bar);
  emscripten::value_object<Person>("Person")
    .field("name", &Person::name)
    .field("age", &Person::age)
    .field("foo", &Person::foo);

  emscripten::function("getPerson", &getPerson);
  emscripten::function("toString", &toString);
}
