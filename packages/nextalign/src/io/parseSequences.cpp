#include <fcntl.h>
#include <fmt/format.h>
#include <nextalign/nextalign.h>
#include <unistd.h>

#include <cstdio>
#include <utility>

#include "kseqpp.h"


class ErrorUnableToOpenFile : public std::runtime_error {
public:
  explicit ErrorUnableToOpenFile(const std::string& filePath)
      : std::runtime_error(fmt::format("Unable to open file: \"{:s}\": {:}", filePath, strerror(errno))) {}
};

class ErrorUnableToReadFile : public std::runtime_error {
public:
  explicit ErrorUnableToReadFile(const std::string& filePath)
      : std::runtime_error(fmt::format("Unable to read file: \"{:s}\": {:}", filePath, strerror(errno))) {}
};


/** Reference-counted file descriptor */
class FileDescriptor {
  static void close_file_descriptor(const int* fd) {
    close(*fd);
    delete fd;// NOLINT(cppcoreguidelines-owning-memory)
  }

  std::unique_ptr<int, decltype(&FileDescriptor::close_file_descriptor)> pfd;

public:
  explicit FileDescriptor(int fd) : pfd(new int(fd), &FileDescriptor::close_file_descriptor) {}

  operator int() const {// NOLINT(google-explicit-constructor)
    return *pfd;
  }
};


class FileReader {
  std::string filePath;
  FileDescriptor fd;

public:
  explicit FileReader(std::string filePath_)
      : filePath(std::move(filePath_)),
        fd(::open(filePath.c_str(), O_RDONLY | O_CLOEXEC)) {
    if (fd < 0) {
      throw ErrorUnableToOpenFile(filePath);
    }
  }

  ssize_t read(void* buf, size_t nBytes) const {
    ssize_t nBytesRead = ::read(fd, buf, nBytes);
    if (nBytesRead < 0) {
      throw ErrorUnableToReadFile(filePath);
    }
    return nBytesRead;
  }
};

class FastaStreamImpl : public FastaStream {
  using KStream = klibpp::KStream<FileReader>;
  KStream kstream;

public:
  FastaStreamImpl() = delete;

  explicit FastaStreamImpl(const std::string& filePath) : kstream(FileReader(filePath)) {}


  bool next(AlgorithmInput& record) override {
    return kstream.next(record);
  }
};

std::unique_ptr<FastaStream> makeFastaStream(const std::string& filename) {
  return std::make_unique<FastaStreamImpl>(filename);
}

safe_vector<AlgorithmInput> parseSequences(const std::string& filename) {
  safe_vector<AlgorithmInput> seqs;

  auto fastaStream = makeFastaStream(filename);

  AlgorithmInput input;
  while (fastaStream->next(input)) {
    seqs.emplace_back(std::move(input));
  }

  return seqs;
}
