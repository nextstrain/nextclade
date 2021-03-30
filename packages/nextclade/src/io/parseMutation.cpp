#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>
#include <utils/safe_cast.h>

#include <boost/algorithm/string.hpp>
#include <boost/xpressive/xpressive.hpp>
#include <string>

namespace Nextclade {
  class ErrorParseMutationInvalidPosition : public std::runtime_error {
  public:
    explicit ErrorParseMutationInvalidPosition(const std::string& pos)
        : std::runtime_error(fmt::format("When parsing mutation: Unable to parse position: \"{:s}\"", pos)) {}
  };

  class ErrorParseMutationInvalidNucleotide : public std::runtime_error {
  public:
    explicit ErrorParseMutationInvalidNucleotide(const std::string& nuc)
        : std::runtime_error(fmt::format("When parsing mutation: Unable to parse nucleotide: \"{:s}\"", nuc)) {}
  };

  class ErrorParseMutationInvalidFormat : public std::runtime_error {
  public:
    explicit ErrorParseMutationInvalidFormat(const std::string& mutation)
        : std::runtime_error(fmt::format("Unable to parse mutation: \"{:s}\"", mutation)) {}
  };

  int parsePosition(const std::string& raw) {
    if (raw.empty()) {
      throw ErrorParseMutationInvalidPosition(raw);
    }

    try {
      const auto num = std::stoi(raw);
      return num - 1;// To 0-based indexing
    } catch (...) {
      throw ErrorParseMutationInvalidPosition(raw);
    }
  }

  Nucleotide parseNucleotide(const std::string& raw) {
    if (raw.size() != 1) {
      throw ErrorParseMutationInvalidNucleotide(raw);
    }
    const char c = safe_cast<char>(std::toupper(raw[0]));
    return toNucleotide(c);
  }

  NucleotideSubstitution parseMutation(const std::string& raw) {
    using boost::xpressive::smatch;
    using boost::xpressive::sregex;

    // clang-format off
    const auto regex = sregex::compile(R"((?P<refNuc>[A-Z-])(?P<pos>\d{1,10})(?P<queryNuc>[A-Z-]))"); // NOLINT(clang-analyzer-core)
    // clang-format on

    const auto upper = boost::to_upper_copy(raw);

    smatch matches;
    if (!regex_match(upper, matches, regex)) {
      throw ErrorParseMutationInvalidFormat(raw);
    }

    const auto& refNucStr = std::string{matches["refNuc"]};
    const auto& posStr = std::string{matches["pos"]};
    const auto& queryNucStr = std::string{matches["queryNuc"]};

    const auto& refNuc = parseNucleotide(refNucStr);
    const auto& pos = parsePosition(posStr);
    const auto& queryNuc = parseNucleotide(queryNucStr);

    return NucleotideSubstitution{.refNuc = refNuc, .pos = pos, .queryNuc = queryNuc, .pcrPrimersChanged = {}};
  }
}// namespace Nextclade
