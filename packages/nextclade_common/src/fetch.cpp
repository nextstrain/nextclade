#include <curl/curl.h>
#include <fmt/format.h>
#include <nextclade_common/fetch.h>

#include <string>

#ifdef __linux__
// Custom CA certificate blob. See comment inside the file.
#include "generated/cainfo.h"
#endif

#include "getCurlCodeString.h"

namespace Nextclade {


  ErrorHttpConnectionFailed::ErrorHttpConnectionFailed(const std::string& url, int ret)
      : ErrorHttp(fmt::format(
          "When fetching a file \"{:}\": {:}: {:}. "
          "Please verify the correctness of the address, check your internet connection and try again later. "
          "Make sure that you have a permission to access the requested resource.",
          url, getCurlCodeString(ret), curl_easy_strerror(static_cast<CURLcode>(ret)))) {}

  ErrorHttpRequestFailed::ErrorHttpRequestFailed(const std::string& url, int status)
      : ErrorHttp(fmt::format(
          "When fetching a file \"{:}\": received HTTP status code {:}. "
          "Please verify the correctness of the address, check your internet connection and try again later. "
          "Make sure that you have a permission to access the requested resource.",
          url, status)) {}

  struct CurlResult {
    int status;
    std::string body;
  };

  class Curl {
    CURL* curl = nullptr;

    inline static size_t writeResult(char* contents, size_t size, size_t nmemb, void* userp) {
      (reinterpret_cast<std::string*>(userp))->append(contents, size * nmemb);
      return size * nmemb;
    }

    inline void setCustomCaInfo() {
#ifdef __linux__
      // Not all Linux distributions have CA certificates setup consistently. Individual systems can also be misconfigured.
      // For example CentOS 7 gives an error "Problem with the SSL CA cert (path? access rights?)".
      // To mitigate, here we set custom CA certificate blob to override system settings.
      // See: https://curl.se/docs/caextract.html
      // See: https://curl.se/libcurl/c/CURLOPT_CAINFO_BLOB.html
      struct curl_blob blob;
      blob.data = const_cast<char*>(cainfo_blob);
      blob.len = strlen(cainfo_blob);
      blob.flags = CURL_BLOB_COPY;
      curl_easy_setopt(curl, CURLOPT_CAINFO_BLOB, &blob);
#endif
    }

  public:
    inline Curl() : curl(curl_easy_init()) {
      if (!curl) {
        throw ErrorHttp(fmt::format("libcurl: initialization failed\n"));
      }
      setCustomCaInfo();
    }

    inline ~Curl() {
      curl_easy_cleanup(curl);
    }

    inline CurlResult get(const std::string& url) {
      curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
      curl_easy_setopt(curl, CURLOPT_ACCEPT_ENCODING, "");

      CurlResult result = {};
      curl_easy_setopt(curl, CURLOPT_WRITEDATA, &(result.body));
      curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, &Curl::writeResult);

      auto ret = curl_easy_perform(curl);
      if (ret) {
        throw ErrorHttpConnectionFailed(url, ret);
      } else {
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &(result.status));
        if (result.status >= 400) {
          throw ErrorHttpRequestFailed(url, result.status);
        }
      }

      return result;
    }
  };

  std::string fetch(const std::string& url) {
    Curl curl;
    const auto result = curl.get(url);
    return result.body;
  }
}// namespace Nextclade
