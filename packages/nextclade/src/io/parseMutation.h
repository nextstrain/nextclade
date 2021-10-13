#pragma once

#include <nextalign/nextalign.h>

#include <stdexcept>
#include <string>

namespace Nextclade {
  struct NucleotideSubstitution;
  struct AminoacidSubstitutionWithoutGene;

  class ErrorParseMutationInvalidPosition : public ErrorNonFatal {
  public:
    explicit ErrorParseMutationInvalidPosition(const std::string& posStr);
  };

  class ErrorParseMutationInvalidNucleotide : public ErrorNonFatal {
  public:
    explicit ErrorParseMutationInvalidNucleotide(const std::string& mut);
  };

  class ErrorParseMutationInvalidAminoacid : public ErrorNonFatal {
  public:
    explicit ErrorParseMutationInvalidAminoacid(const std::string& mut);
  };

  class ErrorParseMutationInvalidFormat : public ErrorNonFatal {
  public:
    explicit ErrorParseMutationInvalidFormat(const std::string_view& mut);
  };

  class ErrorParseAminoacidMutationInvalidFormat : public ErrorNonFatal {
  public:
    explicit ErrorParseAminoacidMutationInvalidFormat(const std::string_view& mut);
  };

  NucleotideSubstitution parseMutation(const std::string& mut);

  AminoacidSubstitutionWithoutGene parseAminoacidMutationWithoutGene(const std::string& mut);
}// namespace Nextclade
