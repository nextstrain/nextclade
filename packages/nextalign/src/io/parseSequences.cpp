#include <fcntl.h>
#include <fmt/format.h>
#include <nextalign/nextalign.h>
#include <unistd.h>

#include <cstdio>

#include "kseqpp.h"


class FastaStreamImpl : public FastaStream {
  using read_function_fd_t = int;
  using read_function_t = ssize_t (*)(int, void*, size_t);
  using KStream = klibpp::KStream<read_function_fd_t, read_function_t>;

  read_function_fd_t fd;
  KStream kstream;

  bool isDone = false;
  int index = 0;

public:
  FastaStreamImpl() = delete;

  explicit FastaStreamImpl(std::istream& is, const std::string& fileName)
      : fd(open(fileName.c_str(), O_RDONLY | O_CLOEXEC)),
        kstream(fd, read) {}

  ~FastaStreamImpl() override {
    close(fd);
  }

  FastaStreamImpl(const FastaStreamImpl& other) = delete;

  FastaStreamImpl operator=(const FastaStreamImpl& other) = delete;

  FastaStreamImpl(FastaStreamImpl&& other) = delete;

  FastaStreamImpl operator=(const FastaStreamImpl&& other) = delete;


  [[nodiscard]] bool good() const override {
    return isDone;
  }

  std::optional<AlgorithmInput> next() override {
    AlgorithmInput record;

    if (!kstream.next(record)) {
      isDone = true;
      return {};
    }
    record.index = index;
    ++index;
    return record;
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
