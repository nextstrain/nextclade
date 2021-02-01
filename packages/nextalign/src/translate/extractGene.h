#pragma once

#include <fmt/format.h>

#include <exception>
#include <string>
#include <vector>

#include "nextalign/private/nextalign_private.h"

struct Gene;

class ErrorExtractGeneLengthInvalid : public std::runtime_error {
public:
  explicit ErrorExtractGeneLengthInvalid(const std::string& gene, int length)
      : std::runtime_error(fmt::format("When extracting gene \"{:s}\": genes expected to have a length that is a "
                                       "multiple of 3, but Gene \"{:s}\" has length {:d}",
          gene, gene, length)) {}
};

NucleotideSequenceView extractGeneRef(const NucleotideSequenceView& ref, const Gene& gene);

NucleotideSequence extractGeneQuery(
  const NucleotideSequenceView& query, const Gene& gene, const std::vector<int>& coordMap);
