#pragma once

#include <fmt/format.h>
#include <nextalign/nextalign.h>
#include <zlib.h>

#include <cerrno>
#include <string>

class ErrorUnableToOpenGzFile : public ErrorFatal {
public:
  inline explicit ErrorUnableToOpenGzFile(const std::string& filePath)
      : ErrorFatal(fmt::format("Unable to open file: \"{:s}\": {:}", filePath, strerror(errno))) {}
};

class ErrorUnableToReadGzFile : public ErrorFatal {
public:
  inline explicit ErrorUnableToReadGzFile(const std::string& filePath)
      : ErrorFatal(fmt::format("Unable to read file: \"{:s}\": {:}", filePath, strerror(errno))) {}
};


/** Reference-counted file descriptor */
class FileDescriptorGz {
  inline static void close_file_descriptor(const gzFile* fd) {
    ::gzclose(*fd);
    delete fd;// NOLINT(cppcoreguidelines-owning-memory)
  }

  std::unique_ptr<gzFile, decltype(&FileDescriptorGz::close_file_descriptor)> pfd;

public:
  inline explicit FileDescriptorGz(gzFile fd) : pfd(new gzFile(fd), &FileDescriptorGz::close_file_descriptor) {}

  inline ~FileDescriptorGz() = default;

  inline FileDescriptorGz(const FileDescriptorGz&) = delete;

  inline const FileDescriptorGz& operator=(const FileDescriptorGz&) = delete;

  inline FileDescriptorGz(FileDescriptorGz&& other) noexcept : pfd(std::move(other.pfd)) {}

  inline FileDescriptorGz& operator=(FileDescriptorGz&& other) noexcept {
    pfd = std::move(other.pfd);
    return *this;
  }

  inline operator gzFile() const {// NOLINT(google-explicit-constructor)
    return *pfd;
  }
};


class FileReaderGz {
  std::string filePath;
  FileDescriptorGz fd;

public:
  inline explicit FileReaderGz(std::string filePath_)
      : filePath(std::move(filePath_)),
        fd(::gzopen(filePath.c_str(), "re")) {
    if (!fd) {
      throw ErrorUnableToOpenGzFile(filePath);
    }
  }

  inline ~FileReaderGz() = default;

  inline FileReaderGz(const FileReaderGz&) = delete;

  inline const FileReaderGz& operator=(const FileReaderGz&) = delete;

  inline FileReaderGz(FileReaderGz&& other) noexcept : filePath(std::move(other.filePath)), fd(std::move(other.fd)) {}

  inline FileReaderGz& operator=(FileReaderGz&& other) noexcept {
    fd = std::move(other.fd);
    filePath = std::move(other.filePath);
    return *this;
  }

  inline ssize_t read(void* buf, size_t nBytes) const {
    ssize_t nBytesRead = ::gzread(fd, buf, nBytes);
    if (nBytesRead < 0) {
      throw ErrorUnableToReadGzFile(filePath);
    }
    return nBytesRead;
  }
};
