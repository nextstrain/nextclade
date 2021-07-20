#include <cpr/cpr.h>
#include <fmt/format.h>
#include <frozen/string.h>
#include <nextclade_common/fetch.h>

#include <string>

namespace Nextclade {
  constexpr frozen::string DEFAULT_CONNECTION_ERROR_MESSAGE =
    "Please verify the correctness of the address, check your internet connection and try again later.";

  constexpr frozen::string DEFAULT_REQUEST_ERROR_MESSAGE =
    "Please verify the correctness of the address, check your internet connection and try again later. "
    "Make sure that you have a permission to access the requested resource and that CORS is enabled on the server.";

  std::string getCprErrorMessage(const cpr::Response& response) {
    if (response.error.message.empty()) {
      return DEFAULT_CONNECTION_ERROR_MESSAGE.data();
    }
    return response.error.message;
  }

  std::string getCprErrorString(const cpr::Response& response) {
    // clang-format off
    switch (response.error.code) {
      case cpr::ErrorCode::OK: return "OK";
      case cpr::ErrorCode::CONNECTION_FAILURE: return "CONNECTION_FAILURE";
      case cpr::ErrorCode::EMPTY_RESPONSE: return "EMPTY_RESPONSE";
      case cpr::ErrorCode::HOST_RESOLUTION_FAILURE: return "HOST_RESOLUTION_FAILURE";
      case cpr::ErrorCode::INTERNAL_ERROR: return "INTERNAL_ERROR";
      case cpr::ErrorCode::INVALID_URL_FORMAT: return "INVALID_URL_FORMAT";
      case cpr::ErrorCode::NETWORK_RECEIVE_ERROR: return "NETWORK_RECEIVE_ERROR";
      case cpr::ErrorCode::NETWORK_SEND_FAILURE: return "NETWORK_SEND_FAILURE";
      case cpr::ErrorCode::OPERATION_TIMEDOUT: return "OPERATION_TIMEDOUT";
      case cpr::ErrorCode::PROXY_RESOLUTION_FAILURE: return "PROXY_RESOLUTION_FAILURE";
      case cpr::ErrorCode::SSL_CONNECT_ERROR: return "SSL_CONNECT_ERROR";
      case cpr::ErrorCode::SSL_LOCAL_CERTIFICATE_ERROR: return "SSL_LOCAL_CERTIFICATE_ERROR";
      case cpr::ErrorCode::SSL_REMOTE_CERTIFICATE_ERROR: return "SSL_REMOTE_CERTIFICATE_ERROR";
      case cpr::ErrorCode::SSL_CACERT_ERROR: return "SSL_CACERT_ERROR";
      case cpr::ErrorCode::GENERIC_SSL_ERROR: return "GENERIC_SSL_ERROR";
      case cpr::ErrorCode::UNSUPPORTED_PROTOCOL: return "UNSUPPORTED_PROTOCOL";
      case cpr::ErrorCode::REQUEST_CANCELLED: return "REQUEST_CANCELLED";
      case cpr::ErrorCode::UNKNOWN_ERROR: return "UNKNOWN_ERROR";
      default: break;
    }
    // clang-format on
    return "UNKNOWN_ERROR";
  }


  ErrorHttpConnectionFailed::ErrorHttpConnectionFailed(const std::string& url, const cpr::Response& response)
      : ErrorHttp(fmt::format("When fetching a file \"{:}\": received an error: {:} (error code: {:}): {:}",//
          url, getCprErrorString(response), response.error.code, getCprErrorMessage(response))) {}

  ErrorHttpRequestFailed::ErrorHttpRequestFailed(const std::string& url, const cpr::Response& response)
      : ErrorHttp(fmt::format("When fetching a file \"{:}\": received an error: {:} (status code: {:}): {:}",//
          url, response.reason, response.status_code, DEFAULT_REQUEST_ERROR_MESSAGE.data())) {}

  std::string fetch(const std::string& url) {

    auto session = cpr::Session();
    session.SetUrl(cpr::Url{url});
    session.SetSslOptions(cpr::Ssl(cpr::ssl::TLSv1_3{}));
    session.SetRedirect(true);
    session.SetMaxRedirects(cpr::MaxRedirects{10});

    auto response = session.Get();

    if (response.error.code != cpr::ErrorCode::OK) {
      throw ErrorHttpConnectionFailed(url, response);
    }

    if (response.status_code != cpr::status::HTTP_OK) {
      throw ErrorHttpRequestFailed(url, response);
    }

    return response.text;
  }
}// namespace Nextclade
