#include <fmt/format.h>
#include <nextalign/nextalign.h>

#include <boost/algorithm/string.hpp>
#include <map>
#include <regex>

namespace {
  using regex = std::regex;
  using std::regex_replace;
}// namespace


class ErrorFastaStreamIllegalNextCall : public std::runtime_error {
public:
  ErrorFastaStreamIllegalNextCall()
      : std::runtime_error("Fasta stream: stream is in non-readable state, the next item cannot be retrieved") {}
};


class ErrorFastaStreamInvalidState : public std::runtime_error {
public:
  ErrorFastaStreamInvalidState()
      : std::runtime_error("Fasta stream: stream reached an invalid state which should not be reached") {}
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
  std::istream& istream;
  std::map<std::string, int> seqNames;

  int currentIndex = 0;
  std::string currentSeqName;
  std::string currentSeq;

  /**
   * Keeps track of sequence names for deduplication
   * and prepares (seqName, seq) entry for returning as the next element of the stream.
   */
  AlgorithmInput prepareResult() {
    if (currentSeqName.empty()) {
      currentSeqName = "Untitled";
    }

    auto it = seqNames.find(currentSeqName);
    if (it != seqNames.end()) {
      const auto nameCount = it->second;
      currentSeqName = fmt::format("{:s} ({:d})", currentSeqName, nameCount);
      it->second += 1;
    } else {
      seqNames.emplace(currentSeqName, 1);
    }

    return {.index = currentIndex, .seqName = currentSeqName, .seq = sanitizeSequence(currentSeq)};
  }


public:
  FastaStreamImpl() = delete;

  explicit FastaStreamImpl(std::istream& is) : istream(is) {}

  ~FastaStreamImpl() override = default;

  FastaStreamImpl(const FastaStreamImpl& other) = delete;

  FastaStreamImpl operator=(const FastaStreamImpl& other) = delete;

  FastaStreamImpl(FastaStreamImpl&& other) = delete;

  FastaStreamImpl operator=(const FastaStreamImpl&& other) = delete;


  [[nodiscard]] bool good() const override {
    return istream.good();
  }


  AlgorithmInput next() override {
    if (!good()) {
      throw ErrorFastaStreamIllegalNextCall();
    }

    std::string line;
    while (std::getline(istream, line)) {
      line = sanitizeLine(line);

      if (boost::starts_with(line, ">")) {
        if (!currentSeq.empty()) {
          auto result = prepareResult();
          ++currentIndex;
          currentSeq = "";
          currentSeqName = sanitizeSequenceName(line);
          return result;
        }

        currentSeqName = sanitizeSequenceName(line);
        currentSeq = "";

      } else if (!line.empty()) {
        currentSeq += line;
      }
    }

    if (!currentSeq.empty()) {
      return prepareResult();
    }

    throw ErrorFastaStreamInvalidState();
  }
};

std::unique_ptr<FastaStream> makeFastaStream(std::istream& istream) {
  return std::make_unique<FastaStreamImpl>(istream);
}

std::vector<AlgorithmInput> parseSequences(std::istream& istream) {
  std::vector<AlgorithmInput> seqs;

  auto fastaStream = makeFastaStream(istream);
  while (fastaStream->good()) {
    seqs.emplace_back(fastaStream->next());
  }

  return seqs;
}
