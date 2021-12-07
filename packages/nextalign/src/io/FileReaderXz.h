#pragma once

#include <fmt/format.h>
#include <lzma.h>
#include <nextalign/nextalign.h>

#include <cerrno>
#include <cstddef>
#include <exception>
#include <string>

#include "FileReaderPlain.h"


inline const char *lzmaRetToString(const lzma_ret &ret) {
  // clang-format off
  switch (ret) {
    case LZMA_OK: return "Success";
    case LZMA_STREAM_END: return "End of stream was reached";
    case LZMA_NO_CHECK: return "Input stream has no integrity check";
    case LZMA_UNSUPPORTED_CHECK: return "Cannot calculate the integrity check";
    case LZMA_GET_CHECK: return "Integrity check type is now available";
    case LZMA_MEM_ERROR: return "Cannot allocate memory";
    case LZMA_MEMLIMIT_ERROR: return "Memory usage limit was reached";
    case LZMA_FORMAT_ERROR: return "File format not recognized";
    case LZMA_OPTIONS_ERROR: return "Invalid or unsupported options";
    case LZMA_DATA_ERROR: return "Data is corrupt";
    case LZMA_BUF_ERROR: return "No progress is possible";
    case LZMA_PROG_ERROR: return "Programming error";
    default: return "Unknown error";
  }
  // clang-format on
}

class ErrorLzmaInit : public ErrorFatal {
public:
  inline explicit ErrorLzmaInit(const std::string &filePath, const lzma_ret &ret)
      : ErrorFatal(fmt::format("\"{:s}\": {:s}", filePath, lzmaRetToString(ret))) {}
};


class ErrorUnableToOpenXzFile : public std::runtime_error {
public:
  inline explicit ErrorUnableToOpenXzFile(const std::string &filePath)
      : std::runtime_error(fmt::format("Unable to open file: \"{:s}\": {:}", filePath, strerror(errno))) {}
};

class ErrorUnableToReadXzFile : public std::runtime_error {
public:
  inline explicit ErrorUnableToReadXzFile(const std::string &filePath)
      : std::runtime_error(fmt::format("Unable to read file: \"{:s}\": {:}", filePath, strerror(errno))) {}
};


class FileReaderXz {
  static constexpr auto INPUT_BUFFER_SIZE = static_cast<size_t>(16 * 1024 * 1024);
  std::array<uint8_t, INPUT_BUFFER_SIZE> inbuf;
  std::string filePath;
  FileReaderPlain reader;
  lzma_stream strm;

public:
  inline explicit FileReaderXz(const std::string &filePath_)
      : filePath(filePath_),
        reader(FileReaderPlain(filePath)),
        strm(LZMA_STREAM_INIT) {
    auto ret = ::lzma_stream_decoder(&strm, UINT64_MAX, LZMA_CONCATENATED);
    if (ret != LZMA_OK) {
      throw ErrorLzmaInit(filePath_, ret);
    }
    strm.next_in = nullptr;
    strm.avail_in = 0;
  }

  inline ~FileReaderXz() {
    ::lzma_end(&strm);
  }

  inline FileReaderXz(const FileReaderXz &) = delete;

  inline const FileReaderXz &operator=(const FileReaderXz &) = delete;

  inline FileReaderXz(FileReaderXz &&other) noexcept
      : inbuf(other.inbuf),
        filePath(std::move(other.filePath)),
        reader(std::move(other.reader)),
        strm(other.strm) {}

  inline FileReaderXz &operator=(FileReaderXz &&other) noexcept {
    inbuf = other.inbuf;
    filePath = std::move(other.filePath);
    reader = std::move(other.reader);
    strm = other.strm;
    return *this;
  }

  inline ssize_t read(void *buf, size_t nBytes) {
    strm.next_out = static_cast<uint8_t *>(buf);
    strm.avail_out = nBytes;

    lzma_action action = LZMA_RUN;

    auto bytesRead = reader.read(inbuf.data(), inbuf.size());

    if (strm.avail_in == 0 && bytesRead >= 0) {
      strm.next_in = inbuf.data();
      strm.avail_in = bytesRead;

      if (bytesRead == 0) {
        action = LZMA_FINISH;
      }
    }

    lzma_ret ret = ::lzma_code(&strm, action);
    if (strm.avail_out != 0) {
      return static_cast<ssize_t>(nBytes - strm.avail_out);
    }

    if (ret != LZMA_OK && ret != LZMA_STREAM_END) {
      throw ErrorUnableToReadXzFile(filePath);
    }

    return 0;
  }
};
