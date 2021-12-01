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

public:
  FastaStreamImpl() = delete;

  explicit FastaStreamImpl(const std::string& fileName)
      : fd(open(fileName.c_str(), O_RDONLY | O_CLOEXEC)),
        kstream(fd, read) {}

  ~FastaStreamImpl() override {
    close(fd);
  }

  FastaStreamImpl(const FastaStreamImpl& other) = delete;

  FastaStreamImpl operator=(const FastaStreamImpl& other) = delete;

  FastaStreamImpl(FastaStreamImpl&& other) = delete;

  FastaStreamImpl operator=(const FastaStreamImpl&& other) = delete;

  bool next(AlgorithmInput& record) override {
    return kstream.next(record);
  }
};

std::unique_ptr<FastaStream> makeFastaStream(const std::string& filename) {
  return std::make_unique<FastaStreamImpl>(filename);
}

std::vector<AlgorithmInput> parseSequences(const std::string& filename) {
  std::vector<AlgorithmInput> seqs;

  auto fastaStream = makeFastaStream(filename);

  AlgorithmInput input;
  while (fastaStream->next(input)) {
    seqs.emplace_back(std::move(input));
  }

  return seqs;
}
