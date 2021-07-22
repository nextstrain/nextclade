#pragma once


#include <optional>
#include <string>
#include <vector>

namespace cpr {
  struct Response;
}// namespace cpr

namespace Nextclade {
  class ErrorHttp : public std::runtime_error {
  public:
    explicit ErrorHttp(const std::string& message) : std::runtime_error(message) {}
  };

  class ErrorHttpConnectionFailed : public ErrorHttp {
  public:
    explicit ErrorHttpConnectionFailed(const std::string& url, int ret);
  };

  class ErrorHttpRequestFailed : public ErrorHttp {
  public:
    explicit ErrorHttpRequestFailed(const std::string& url, int status);
  };


  std::string fetch(const std::string& url);
}// namespace Nextclade
