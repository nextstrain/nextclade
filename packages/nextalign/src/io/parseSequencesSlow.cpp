#include <fmt/format.h>
#include <nextalign/nextalign.h>

#include <boost/algorithm/string.hpp>
#include <map>
#include <regex>
#include <utility>

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


class FastaStreamSlowImpl : public FastaStream {
  std::istream& istream;
  std::string filename;
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
  FastaStreamSlowImpl() = delete;

  explicit FastaStreamSlowImpl(std::istream& is, std::string fileName) : istream(is), filename(std::move(fileName)) {}

  ~FastaStreamSlowImpl() override = default;

  FastaStreamSlowImpl(const FastaStreamSlowImpl& other) = delete;

  FastaStreamSlowImpl operator=(const FastaStreamSlowImpl& other) = delete;

  FastaStreamSlowImpl(FastaStreamSlowImpl&& other) = delete;

  FastaStreamSlowImpl operator=(const FastaStreamSlowImpl&& other) = delete;

  bool next(AlgorithmInput& result) override {
    if (istream.eof()) {
      return false;
    }

    if (!istream.good()) {
      throw ErrorFastaStreamIllegalNextCall(filename);
    }

    std::string line;
    while (std::getline(istream, line)) {
      line = sanitizeLine(line);

      if (boost::starts_with(line, ">")) {
        if (!currentSeq.empty()) {
          result = prepareResult();
          ++currentIndex;
          currentSeq = "";
          currentSeqName = sanitizeSequenceName(line);
          return true;
        }

        currentSeqName = sanitizeSequenceName(line);
        currentSeq = "";

      } else if (!line.empty()) {
        currentSeq += line;
      }
    }

    if (!currentSeq.empty()) {
      result = prepareResult();
      return true;
    }

    return false;
  }
};

std::unique_ptr<FastaStream> makeFastaStreamSlow(std::istream& istream, const std::string& filename) {
  return std::make_unique<FastaStreamSlowImpl>(istream, filename);
}

std::vector<AlgorithmInput> parseSequencesSlow(std::istream& istream, const std::string& filename) {
  std::vector<AlgorithmInput> seqs;

  auto fastaStream = makeFastaStreamSlow(istream, filename);
  AlgorithmInput input;
  while (fastaStream->next(input)) {
    seqs.emplace_back(std::move(input));
  }

  return seqs;
}
