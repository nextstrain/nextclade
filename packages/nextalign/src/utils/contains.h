#pragma once

template<typename AssociativeContainer, typename Element>
bool contains(const AssociativeContainer& container, const Element& element) {
  return container.find(element) != container.end();
}
