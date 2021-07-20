#pragma once

#include <nextclade/nextclade.h>

#include <fstream>
#include <string>

namespace Nextclade {
  class ErrorFastaReader : public ErrorFatal {
  public:
    inline explicit ErrorFastaReader(const std::string &message) : ErrorFatal(message) {}
  };

  struct ReferenceSequenceData {
    const NucleotideSequence seq;
    const std::string name;
    const int length;
  };

  inline ReferenceSequenceData parseRefFastaFile(const std::string &filename) {
    std::ifstream file(filename);
    if (!file.good()) {
      throw ErrorFastaReader(fmt::format("Error: unable to read \"{:s}\"\n", filename));
    }

    const auto refSeqs = parseSequences(file, filename);
    if (refSeqs.size() != 1) {
      throw ErrorFastaReader(
        fmt::format("Error: {:d} sequences found in reference sequence file, expected 1", refSeqs.size()));
    }

    const auto &refSeq = refSeqs.front();
    const auto &seq = toNucleotideSequence(refSeq.seq);
    const auto length = static_cast<int>(seq.size());
    return {.seq = seq, .name = refSeq.seqName, .length = length};
  }
}// namespace Nextclade
