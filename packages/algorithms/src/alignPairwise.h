#pragma once

#include <string>

struct Alignment {
  std::string query;
  std::string ref;
  int alignmentScore;
};

Alignment alignPairwise(const std::string& query, const std::string& ref, int minimalLength);
