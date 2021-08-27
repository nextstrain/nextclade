#pragma once

#include <nextalign/nextalign.h>

#include <stdexcept>
#include <string>

namespace Nextclade {
  struct NucleotideSubstitution;

  class ErrorParseMutationInvalidPosition : public ErrorNonFatal {
  public:
    explicit ErrorParseMutationInvalidPosition(const std::string& posStr);
  };

  class ErrorParseMutationInvalidNucleotide : public ErrorNonFatal {
  public:
    explicit ErrorParseMutationInvalidNucleotide(const std::string& mut);
  };

  class ErrorParseMutationInvalidFormat : public ErrorNonFatal {
  public:
    explicit ErrorParseMutationInvalidFormat(const std::string_view& mut);
  };

  NucleotideSubstitution parseMutation(const std::string& mut);
}// namespace Nextclade
