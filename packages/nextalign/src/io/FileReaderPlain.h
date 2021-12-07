#pragma once

#include <fcntl.h>
#include <fmt/format.h>
#include <nextalign/nextalign.h>
#include <unistd.h>

#include <cerrno>
#include <cstring>
#include <string>

class ErrorUnableToOpenPlainFile : public ErrorFatal {
public:
  inline explicit ErrorUnableToOpenPlainFile(const std::string& filePath)
      : ErrorFatal(fmt::format("Unable to open file: \"{:s}\": {:}", filePath, strerror(errno))) {}
};

class ErrorUnableToReadPlainFile : public ErrorFatal {
public:
  inline explicit ErrorUnableToReadPlainFile(const std::string& filePath)
      : ErrorFatal(fmt::format("Unable to read file: \"{:s}\": {:}", filePath, strerror(errno))) {}
};


/** Reference-counted file descriptor */
class FileDescriptorPlain {
  inline static void close_file_descriptor(const int* fd) {
    ::close(*fd);
    delete fd;// NOLINT(cppcoreguidelines-owning-memory)
  }

  std::unique_ptr<int, decltype(&FileDescriptorPlain::close_file_descriptor)> pfd;

public:
  inline explicit FileDescriptorPlain(int fd) : pfd(new int(fd), &FileDescriptorPlain::close_file_descriptor) {}

  inline ~FileDescriptorPlain() = default;

  inline FileDescriptorPlain(const FileDescriptorPlain&) = delete;

  inline const FileDescriptorPlain& operator=(const FileDescriptorPlain&) = delete;

  inline FileDescriptorPlain(FileDescriptorPlain&& d) noexcept : pfd(std::move(d.pfd)) {}

  inline FileDescriptorPlain& operator=(FileDescriptorPlain&& d) noexcept {
    pfd = std::move(d.pfd);
    return *this;
  }

  inline operator int() const {// NOLINT(google-explicit-constructor)
    return *pfd;
  }
};

/** Reads plain (uncompressed) files */
class FileReaderPlain {
  std::string filePath;
  FileDescriptorPlain fd;

public:
  inline explicit FileReaderPlain(std::string filePath_)
      : filePath(std::move(filePath_)),
        fd(::open(filePath.c_str(), O_RDONLY | O_CLOEXEC)) {
    if (fd < 0) {
      throw ErrorUnableToOpenPlainFile(filePath);
    }
  }

  inline ~FileReaderPlain() = default;

  inline FileReaderPlain(const FileReaderPlain&) = delete;

  inline const FileReaderPlain& operator=(const FileReaderPlain&) = delete;

  inline FileReaderPlain(FileReaderPlain&& other) noexcept
      : filePath(std::move(other.filePath)),
        fd(std::move(other.fd)) {}

  inline FileReaderPlain& operator=(FileReaderPlain&& other) noexcept {
    filePath = std::move(other.filePath);
    fd = std::move(other.fd);
    return *this;
  }

  inline ssize_t read(void* buf, size_t nBytes) const {
    ssize_t nBytesRead = ::read(fd, buf, nBytes);
    if (nBytesRead < 0) {
      throw ErrorUnableToReadPlainFile(filePath);
    }
    return nBytesRead;
  }
};
