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

    const auto regex = sregex::compile("(?P<refNuc>[A-Z-])(?P<pos>(\\d)*)(?P<queryNuc>[A-Z-])");

    smatch matches;
    if (!regex_match(boost::to_upper_copy(raw), matches, regex)) {
      throw ErrorParseMutationInvalidFormat(raw);
    }

    const auto& refNuc = parseNucleotide(matches["refNuc"]);
    const auto& pos = parsePosition(matches["pos"]);
    const auto& queryNuc = parseNucleotide(matches["queryNuc"]);

    return {.refNuc = refNuc, .pos = pos, .queryNuc = queryNuc};
  }

  std::string formatMutation(const NucleotideSubstitution& mut) {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    const auto positionOneBased = mut.pos + 1;
    return fmt::format("{}{}{}", nucToChar(mut.refNuc), positionOneBased, nucToChar(mut.queryNuc));
  }
}// namespace Nextclade
