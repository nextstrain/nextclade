#include <nextalign/nextalign.h>

#include <cctype>
#include <string>

#include "../utils/safe_cast.h"

namespace {
  inline bool is_char_allowed(char c) {
    return std::isalpha(c) || c == '.' || c == '?' || c == '*';
  }
}// namespace

std::string sanitizeSequenceString(const std::string& str) {
  std::string output;
  output.reserve(str.size());
  for (char c : str) {
    if (is_char_allowed(c)) {
      output += safe_cast<char>(std::toupper(c));
    }
  }
  output.shrink_to_fit();
  return output;
}
