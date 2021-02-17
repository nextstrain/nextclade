#include <emscripten.h>
#include <emscripten/bind.h>
#include <fmt/format.h>

#include <exception>
#include <optional>
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


struct Node {
  int foo;
  std::string bar;
  std::optional<std::vector<Node>> children;
};

struct AuspiceJsonV2 {
  Node tree;
};


template<typename OptionalType>
struct StdOptional {
  static emscripten::val value(const OptionalType& v) {
    return emscripten::val(v.value());
  }

  static emscripten::val has_value(OptionalType& v) {
    return emscripten::val(v.has_value());
  }
};

template<typename V>
emscripten::class_<std::optional<V>> register_optional(const char* name) {
  return emscripten::class_<std::optional<V>>(name)
    .constructor()
    .template constructor<V>()
    .function("value", &StdOptional<std::optional<V>>::value)
    .function("has_value", &StdOptional<std::optional<V>>::has_value);
}

std::string getOptional(const std::optional<int> x) {
  if (x) {
    return "optional: " + std::to_string(*x);
  }

  return "optional: empty";
}

//std::string getAuspiceJson(const Node& node) {
//  const auto hasChildren = node.children.has_value();
//
//  fmt::memory_buffer buf;
//  fmt::format_to(buf, "{:d} {:s} {:d}", node.foo, node.bar, hasChildren);
//  std::string result = fmt::to_string(buf);
//
//  if (hasChildren) {
//    for (const auto& child : *node.children) {
//      result += " | " + getAuspiceJson(child);
//    }
//  }
//
//  return result;
//}


Node getAuspiceJson(const Node& node) {
//  const auto hasChildren = node.children.has_value();
//
//  fmt::memory_buffer buf;
//  fmt::format_to(buf, "{:d} {:s} {:d}", node.foo, node.bar, hasChildren);
//  std::string result = fmt::to_string(buf);
//
//  if (hasChildren) {
//    for (const auto& child : *node.children) {
//      result += " | " + getAuspiceJson(child);
//    }
//  }

  return node;
}


EMSCRIPTEN_BINDINGS(opt) {
  //  register_optional<int>("hello");
  //  emscripten::function("getOptional", &getOptional);

  emscripten::value_object<Node>("Node")
    .field("foo", &Node::foo)
    .field("bar", &Node::bar)
    .field("children", &Node::children);


  emscripten::register_vector<Node>("NodeArray");

  register_optional<std::vector<Node>>("OptionalNodeArray");

  emscripten::function<Node, const Node&>("getAuspiceJson", &getAuspiceJson);
}
