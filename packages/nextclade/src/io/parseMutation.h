#pragma once

#include <stdexcept>
#include <string>
#include <string_view>

namespace Nextclade {
  struct NucleotideSubstitution;

  class ErrorParseMutationInvalidPosition : public std::runtime_error {
  public:
    explicit ErrorParseMutationInvalidPosition(const std::string_view& posStr);
  };

  class ErrorParseMutationInvalidNucleotide : public std::runtime_error {
  public:
    explicit ErrorParseMutationInvalidNucleotide(char nuc);
  };

  class ErrorParseMutationInvalidFormat : public std::runtime_error {
  public:
    explicit ErrorParseMutationInvalidFormat(const std::string_view& mut);
  };

  NucleotideSubstitution parseMutation(const std::string& mut);
}// namespace Nextclade
