#include <emscripten/bind.h>

#include <string>

struct Foo {// NOLINT(cppcoreguidelines-pro-type-member-init)
  double bar;
};

struct Person {// NOLINT(cppcoreguidelines-pro-type-member-init)
  std::string name;
  int age;
  Foo foo;
};

Person getPerson() {
  return {.name = "Bob", .age = 33, .foo = {.bar = 3.1415}};// NOLINT(cppcoreguidelines-avoid-magic-numbers)
}

std::string toString(const Person& p) {
  return "Person: " + std::string(p.name) + " | " + std::to_string(p.age) + " | " + std::to_string(p.foo.bar);
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
