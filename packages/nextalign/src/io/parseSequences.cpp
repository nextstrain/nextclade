#include <fmt/format.h>
#include <nextalign/nextalign.h>

#include <boost/algorithm/string.hpp>
#include <cstdio>
#include <map>
#include <regex>
#include <utility>

#include "kseq.h"
KSEQ_INIT(int, read)

namespace {
  using regex = std::regex;
  using std::regex_replace;
}// namespace


class ErrorFastaStreamIllegalNextCall : public ErrorFatal {
public:
  explicit ErrorFastaStreamIllegalNextCall(const std::string& filename)
      : ErrorFatal(fmt::format("When parsing input sequences: Input stream (\"{:s}\") is in non-readable state,"
                               " the next line cannot be retrieved. Aborting.",
          filename)) {}
};


class ErrorFastaStreamInvalidState : public ErrorFatal {
public:
  explicit ErrorFastaStreamInvalidState(const std::string& filename)
      : ErrorFatal(fmt::format("When parsing input sequences: Input stream (\"{:s}\") is empty or corrupted. Aborting.",
          filename)) {}
};


auto sanitizeLine(std::string line) {
  line = regex_replace(line, regex("\r\n"), "\n");
  line = regex_replace(line, regex("\r"), "\n");
  boost::trim(line);
  return line;
}

auto sanitizeSequenceName(std::string seqName) {
  seqName = seqName.substr(1, seqName.size());
  boost::trim(seqName);
  return seqName;
}

auto sanitizeSequence(std::string seq) {
  boost::to_upper(seq);
  // NOTE: Strip all characters except capital letters, asterisks, dots and question marks
  const auto re = regex("[^.?*A-Z]");
  seq = regex_replace(seq, re, "", std::regex_constants::match_any);
  return seq;
}


class FastaStreamImpl : public FastaStream {
  FILE* fp = nullptr;
  kseq_t* kseq = nullptr;
  bool isDone = false;
  int index = 0;

public:
  FastaStreamImpl() = delete;

  explicit FastaStreamImpl(std::istream& is, std::string fileName)
      : fp(fopen(fileName.c_str(), "re")),
        kseq(kseq_init(fileno(fp))) {}

  ~FastaStreamImpl() override {
    kseq_destroy(kseq);
    fclose(fp);
  }

  FastaStreamImpl(const FastaStreamImpl& other) = delete;

  FastaStreamImpl operator=(const FastaStreamImpl& other) = delete;

  FastaStreamImpl(FastaStreamImpl&& other) = delete;

  FastaStreamImpl operator=(const FastaStreamImpl&& other) = delete;


  [[nodiscard]] bool good() const override {
    return isDone;
  }


  std::optional<AlgorithmInput> next() override {
    isDone = kseq_read(kseq) < 0;
    if (!kseq || isDone) {
      return {};
    }

    const AlgorithmInput result{
      .index = index,
      .seqName = std::string{kseq->name.s},
      .seq = std::string{kseq->seq.s},
    };

    ++index;

    return result;
  }
};

std::unique_ptr<FastaStream> makeFastaStream(std::istream& istream, std::string filename) {
  return std::make_unique<FastaStreamImpl>(istream, std::move(filename));
}

std::vector<AlgorithmInput> parseSequences(std::istream& istream, std::string filename) {
  std::vector<AlgorithmInput> seqs;

  auto fastaStream = makeFastaStream(istream, std::move(filename));

  std::optional<AlgorithmInput> input = fastaStream->next();
  while (input) {
    seqs.emplace_back(std::move(*input));
    input = fastaStream->next();
  }

  return seqs;
}
