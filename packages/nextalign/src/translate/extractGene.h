#pragma once

#include <fmt/format.h>

#include <exception>
#include <string>
#include <vector>

#include "nextalign/private/nextalign_private.h"

struct Gene;

NucleotideSequenceView extractGeneRef(const NucleotideSequenceView& ref, const Gene& gene);

struct ExtractGeneStatus {
  Status status;
  std::optional<std::string> error;
  std::optional<NucleotideSequence> result;
};

ExtractGeneStatus extractGeneQuery(const NucleotideSequenceView& query, const Gene& gene,
  const std::vector<int>& coordMap);
