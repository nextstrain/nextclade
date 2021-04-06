#include "parseMutation.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>
#include <utils/safe_cast.h>

#include <string>

namespace Nextclade {

  int parsePosition(const std::string_view& posStr) {
    if (posStr.empty()) {
      throw ErrorParseMutationInvalidPosition(posStr);
    }

    try {
      const auto num = std::stoi(posStr.data());
      return num - 1;// To 0-based indexing
    } catch (...) {
      throw ErrorParseMutationInvalidPosition(posStr);
    }
  }

  Nucleotide parseNucleotide(char nuc) {
    try {
      return toNucleotide(nuc);
    } catch (...) {
      throw ErrorParseMutationInvalidNucleotide(nuc);
    }
  }

  NucleotideSubstitution parseMutation(const std::string_view& mut) {
    if (mut.size() < 3) {
      throw ErrorParseMutationInvalidFormat(mut);
    }

    const auto& refNuc = parseNucleotide(mut[0]);
    const auto& pos = parsePosition(mut.substr(1, mut.size() - 2));
    const auto& queryNuc = parseNucleotide(mut[mut.size() - 1]);

    return NucleotideSubstitution{.refNuc = refNuc, .pos = pos, .queryNuc = queryNuc, .pcrPrimersChanged = {}};
  }

  NucleotideSubstitution parseMutation(const std::string& mut) {
    return parseMutation(std::string_view{mut});
  }

  Nextclade::ErrorParseMutationInvalidNucleotide::ErrorParseMutationInvalidNucleotide(char nuc)
      : std::runtime_error(fmt::format("When parsing mutation: Unable to parse nucleotide: \"{}\"", std::string{nuc})) {
  }

  Nextclade::ErrorParseMutationInvalidPosition::ErrorParseMutationInvalidPosition(const std::string_view& posStr)
      : std::runtime_error(fmt::format("When parsing mutation: Unable to parse position: \"{:s}\"", posStr)) {}

  ErrorParseMutationInvalidFormat::ErrorParseMutationInvalidFormat(const std::string_view& mut)
      : std::runtime_error(
          fmt::format("When parsing mutation: Unable to parse mutation. The format is invalid: \"{:s}\"", mut)) {}
}// namespace Nextclade
