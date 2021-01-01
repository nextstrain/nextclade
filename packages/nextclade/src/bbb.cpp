#include "bbb.h"

#include <string>


Person getPerson() {
  return {.name = "Bob", .age = 33, .foo = {.bar = 3.1415}};// NOLINT(cppcoreguidelines-avoid-magic-numbers)
}

std::string toString(const Person& p) {
  return "Person: " + std::string(p.name) + " | " + std::to_string(p.age) + " | " + std::to_string(p.foo.bar);
}
