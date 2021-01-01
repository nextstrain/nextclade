#pragma once

#include <string>

struct Foo {// NOLINT(cppcoreguidelines-pro-type-member-init)
  double bar;
};

struct Person {// NOLINT(cppcoreguidelines-pro-type-member-init)
  std::string name;
  int age;
  Foo foo;
};

Person getPerson();

std::string toString(const Person& p);
