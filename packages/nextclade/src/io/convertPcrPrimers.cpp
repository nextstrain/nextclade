#include "convertPcrPrimers.h"

#include <fmt/format.h>
#include <frozen/map.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <boost/algorithm/string/predicate.hpp>
#include <regex>
#include <vector>

#include "../analyze/nucleotide.h"
#include "../utils/map.h"
#include "../utils/mapFind.h"
#include "../utils/safe_cast.h"
#include "parseCsv.h"

namespace Nextclade {
  constexpr auto NUCLEOTIDE_COMPLEMENTS = frozen::make_map<Nucleotide, Nucleotide, 15>({
    {Nucleotide::A, Nucleotide::T},
    {Nucleotide::C, Nucleotide::G},
    {Nucleotide::G, Nucleotide::C},
    {Nucleotide::T, Nucleotide::A},
    {Nucleotide::Y, Nucleotide::R},
    {Nucleotide::R, Nucleotide::Y},
    {Nucleotide::W, Nucleotide::W},
    {Nucleotide::S, Nucleotide::S},
    {Nucleotide::K, Nucleotide::M},
    {Nucleotide::M, Nucleotide::K},
    {Nucleotide::D, Nucleotide::H},
    {Nucleotide::V, Nucleotide::B},
    {Nucleotide::H, Nucleotide::D},
    {Nucleotide::B, Nucleotide::V},
    {Nucleotide::N, Nucleotide::N},
  });

  /**
   * Returns complement of a nucleotide
   */
  Nucleotide complement(Nucleotide nuc) {
    const auto comp = mapFind(NUCLEOTIDE_COMPLEMENTS, nuc);
    if (!comp) {
      throw ErrorPcrPrimersCsvParserComplementUnknownNucleotide(nucToString(nuc));
    }
    return *comp;
  }

  /**
   * Reverses the sequence and replaces every nucleotide by its complement
   */
  void reverseComplementInPlace(NucleotideSequence& seq) {
    std::reverse(seq.begin(), seq.end());
    for (auto& nuc : seq) {
      nuc = complement(nuc);
    }
  }

  constexpr const auto PCR_PRIMERS_CSV_NUM_COLUMNS = 4;

  using CsvReader = io::CSVReader<             //
    PCR_PRIMERS_CSV_NUM_COLUMNS,               //
    io::trim_chars<' '>,                       //
    io::double_quote_escape<',', '"'>,         //
    io::throw_on_overflow,                     //
    io::single_and_empty_line_comment<'#', ' '>//
    >;

  constexpr const auto GFF_COLUMNS_REQUIRED = {
    /* 1 */ "Country (Institute)",
    /* 2 */ "Target",
    /* 3 */ "Oligonucleotide",
    /* 4 */ "Sequence",
  };

  struct PcrPrimerCsvRow {
    /* 1 */ std::string source;
    /* 2 */ std::string target;
    /* 3 */ std::string name;
    /* 4 */ std::string primerOligonuc;
  };


  bool isNotAcgtChar(char c) {
    return c != 'A' && c != 'C' && c != 'G' && c != 'T';
  }

  void replaceInPlace(std::string& str, const std::function<bool(char)>& shouldReplace, char replacement) {
    for (auto& c : str) {
      if (shouldReplace(c)) {
        c = replacement;
      }
    }
  }

  struct FindPrimerResult {
    int begin;
    NucleotideSequence rootOligonuc;
  };

  /**
   * Given a primer sequence finds position and subsequence of the corresponding area in the root sequence
   */
  std::optional<FindPrimerResult> findPrimerInRootSeq(//
    const std::string& name,                          //
    const NucleotideSequence& primer,                 //
    const NucleotideSequence& ref,                    //
    /* inout */ std::vector<std::string>& warnings    //
  ) {
    const auto refStr = toString(ref);
    const auto primerStr = toString(primer);

    // Prepare search string by replacing "bad" nucleotides with '.' (will signify "any character" in the regex)
    auto primerStrSanitized = std::string{primerStr};
    replaceInPlace(primerStrSanitized, &isNotAcgtChar, '.');
    const auto re = std::regex{primerStrSanitized};

    std::smatch matches;
    if (!std::regex_search(refStr, matches, re)) {
      return {};
    }

    if (matches.empty()) {
      return {};
    }

    if (matches.size() > 1) {
      warnings.emplace_back(fmt ::format(
        "When parsing PCR primer CSV: When searching fragments of PCR primer \"{:s}\" (oligonucleotide: \"{:s}\") in "
        "the root sequence: Found more than one match (specifically: {:d}). This might mean that the list of primers "
        "is not compatible with the root sequence used, or that the PCR primers are not chosen well. Continuing, "
        "but will consider only the first match and ignore the rest. PCR primer checks might be unreliable",
        name, primerStr, matches.size()));
    }

    const int begin = safe_cast<int>(matches.position(0));
    const auto rootOligonuc = toNucleotideSequence(matches[0].str());

    return std::make_optional(FindPrimerResult{
      .begin = begin,
      .rootOligonuc = rootOligonuc,
    });
  }

  /**
   * Finds locations {nuc, pos} of nucleotides that are not A, C, G, T in a given sequence.
   * Resulting positions can be adjusted by an offset.
   */
  std::vector<NucleotideLocation> findNonAcgt(const NucleotideSequence& seq, int offset = 0) {
    std::vector<NucleotideLocation> nonAcgts;
    const auto len = safe_cast<int>(seq.size());
    for (int i = 0; i < len; ++i) {
      const auto& nuc = seq[i];
      if (isNotAcgt(nuc)) {
        nonAcgts.emplace_back(NucleotideLocation{.pos = i + offset, .nuc = nuc});
      }
    }
    return nonAcgts;
  }

  /**
   * Converts one row to PCR primer. If conversion fails, returns std::nullopt
   */
  std::optional<PcrPrimer> convertPcrPrimer(      //
    const PcrPrimerCsvRow& primerEntry,           //
    const NucleotideSequence& rootSeq,            //
    /* inout */ std::vector<std::string>& warnings//
  ) {
    auto primerOligonucMaybeReverseComplemented = toNucleotideSequence(primerEntry.primerOligonuc);

    // If this is a reverse primer, we need to reverse-complement it before attempting to match with root sequence
    if (boost::ends_with(primerEntry.name, "_R")) {
      reverseComplementInPlace(primerOligonucMaybeReverseComplemented);
    }

    // Try to find primer fragment in the root sequence
    auto found = findPrimerInRootSeq(primerEntry.name, primerOligonucMaybeReverseComplemented, rootSeq, warnings);
    if (!found) {
      // If match fails, try to reverse-complement and try to match again
      reverseComplementInPlace(primerOligonucMaybeReverseComplemented);
      found = findPrimerInRootSeq(primerEntry.name, primerOligonucMaybeReverseComplemented, rootSeq, warnings);
    }

    if (!found) {
      warnings.emplace_back(fmt::format(
        "When parsing PCR primer CSV: Unable to find PCR primer \"{:s}\" (oligonucleotide: \"{:s}\") in the root "
        "sequence. This might mean that the list of primers is not compatible with the root sequence used",
        primerEntry.name, primerEntry.primerOligonuc));
      return {};
    }

    NucleotideSequence rootOligonuc = found->rootOligonuc;
    NucleotideSequence primerOligonuc = toNucleotideSequence(primerEntry.primerOligonuc);

    int begin = found->begin;
    int end = safe_cast<int>(begin + found->rootOligonuc.size());
    Range range{.begin = begin, .end = end};

    std::vector<NucleotideLocation> nonAcgts = findNonAcgt(primerOligonucMaybeReverseComplemented, begin);

    return std::make_optional(PcrPrimer{
      .name = primerEntry.name,
      .target = primerEntry.target,
      .source = primerEntry.source,
      .rootOligonuc = rootOligonuc,
      .primerOligonuc = primerOligonuc,
      .range = range,
      .nonAcgts = nonAcgts,
    });
  }

  /**
   * Parses PCR primer CSV string from an input stream and returns a list of PCR primers
   */
  std::vector<PcrPrimer> parsePcrPrimersCsv(      //
    const std::string& pcrPrimersCsvString,       //
    const std::string& filename,                  //
    const NucleotideSequence& rootSeq,            //
    /* inout */ std::vector<std::string>& warnings//
  ) {
    std::stringstream is{pcrPrimersCsvString};
    CsvReader reader(filename, is);

    reader.read_header(             //
      io::ignore_no_column,         //
      /* 1 */ "Country (Institute)",//
      /* 2 */ "Target",             //
      /* 3 */ "Oligonucleotide",    //
      /* 4 */ "Sequence"            //
    );

    std::for_each(std::begin(GFF_COLUMNS_REQUIRED), std::end(GFF_COLUMNS_REQUIRED), [&reader](const auto& colName) {
      if (!reader.has_column(colName)) {
        throw ErrorPcrPrimersCsvParserMissingColumn(colName);
      }
    });

    /* 1 */ std::string source;
    /* 2 */ std::string target;
    /* 3 */ std::string name;
    /* 4 */ std::string primerOligonuc;

    std::vector<PcrPrimer> pcrPrimers;
    while (reader.read_row(source, target, name, primerOligonuc)) {
      auto row = PcrPrimerCsvRow{
        .source = source,
        .target = target,
        .name = name,
        .primerOligonuc = primerOligonuc,
      };

      const auto primer = convertPcrPrimer(row, rootSeq, warnings);
      if (primer) {
        pcrPrimers.emplace_back(*primer);
      }
    }

    return pcrPrimers;
  }

  ErrorPcrPrimersCsvParserComplementUnknownNucleotide::ErrorPcrPrimersCsvParserComplementUnknownNucleotide(
    const std::string& nuc)
      : std::runtime_error(
          fmt::format("When parsing PCR primers CSV: When performing primer oligonucleotide complement: "
                      "Found unknown nucleotide: \"{:s}\"",
            nuc)) {}

  ErrorPcrPrimersCsvParserMissingColumn::ErrorPcrPrimersCsvParserMissingColumn(const std::string& colName)
      : std::runtime_error(fmt::format("When parsing PCR primers CSV: Missing required column: \"{:s}\"", colName)) {}
}// namespace Nextclade
