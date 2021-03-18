#pragma once

template<typename Container>
void eraseDuplicatesInPlace(Container& c) {
  std::sort(c.begin(), c.end());
  c.erase(std::unique(c.begin(), c.end()), c.end());
}
