#pragma once

#include <stdexcept>
#include <string>

namespace Nextclade {
  struct NucleotideSubstitution;

  class ErrorParseMutationInvalidPosition : public std::runtime_error {
  public:
    explicit ErrorParseMutationInvalidPosition(const std::string& posStr);
  };

  class ErrorParseMutationInvalidNucleotide : public std::runtime_error {
  public:
    explicit ErrorParseMutationInvalidNucleotide(const std::string& mut);
  };

  class ErrorParseMutationInvalidFormat : public std::runtime_error {
  public:
    explicit ErrorParseMutationInvalidFormat(const std::string_view& mut);
  };

  NucleotideSubstitution parseMutation(const std::string& mut);
}// namespace Nextclade
