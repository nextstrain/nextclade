#pragma once

#include <frozen/string.h>

template<typename AssociativeContainer, typename Element>
bool contains(const AssociativeContainer& container, Element element) {
  return container.find(element) != container.end();
}

template<typename Char>
bool contains(const std::basic_string<Char>& str, Char element) {
  return str.find(element) != std::string::npos;
}

template<typename Char>
bool contains(const frozen::basic_string<Char>& str, Char element) {
  const auto begin = str.data();
  const auto end = begin + str.size();
  return std::find(begin, end, element) != end;
}
