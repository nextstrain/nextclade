#pragma once

#include <fmt/format.h>
#include <frozen/string.h>// NOLINT(modernize-deprecated-headers) // false positive

#include <array>

class ErrorVerbosityLevelInvalid : public std::runtime_error {
public:
  explicit ErrorVerbosityLevelInvalid(const std::string& verb);
};


class Logger {
public:
  enum class Verbosity : int {
    silent = 0,
    error = 1,
    warn = 2,
    info = 3,
    debug = 4,
  };

  static constexpr std::array<frozen::string, 5> VERBOSITY_LEVELS = {
    "silent",
    "error",
    "warn",
    "info",
    "debug",
  };

  static constexpr frozen::string VERBOSITY_DEFAULT_STR = VERBOSITY_LEVELS[2];

  struct Options {
    Verbosity verbosity = Verbosity::warn;
  };

  static inline std::string getVerbosityLevels() {
    std::vector<std::string> quoted;
    std::transform(VERBOSITY_LEVELS.cbegin(), VERBOSITY_LEVELS.cend(), std::back_inserter(quoted),
      [](const frozen::string& x) { return fmt::format("\"{}\"", x.data()); });
    return boost::algorithm::join(quoted, ", ");
  }

  static inline Logger::Verbosity convertVerbosity(const std::string& verbosityStr) {
    const auto& found =
      std::find_if(VERBOSITY_LEVELS.cbegin(), VERBOSITY_LEVELS.cend(), [&verbosityStr](const frozen::string& verb) {
        std::string v{verb.data()};
        return v == std::string{verbosityStr};
      });

    if (found == VERBOSITY_LEVELS.cend()) {
      throw ErrorVerbosityLevelInvalid(verbosityStr);
    }

    auto verbInt = static_cast<int>(std::distance(VERBOSITY_LEVELS.cbegin(), found));
    return Logger::Verbosity{verbInt};
  }

  static inline std::string getVerbosityDefaultLevel() {
    return std::string{VERBOSITY_DEFAULT_STR.data()};
  }

private:
  Options options;


public:
  Logger() = default;

  explicit Logger(const Options& loggerOptions) : options(loggerOptions) {}

  template<typename S, typename... Args>
  inline void debug(const S& format_str, Args&&... args) {
    if (options.verbosity >= Verbosity::debug) {
      fmt::print(format_str, args...);
    }
  }

  template<typename S, typename... Args>
  inline void info(const S& format_str, Args&&... args) {
    if (options.verbosity >= Verbosity::info) {
      fmt::print(format_str, args...);
    }
  }

  template<typename S, typename... Args>
  inline void warn(const S& format_str, Args&&... args) {
    if (options.verbosity >= Verbosity::warn) {
      fmt::print(stderr, format_str, args...);
    }
  }

  template<typename S, typename... Args>
  inline void error(const S& format_str, Args&&... args) {
    if (options.verbosity >= Verbosity::error) {
      fmt::print(stderr, format_str, args...);
    }
  }
};

ErrorVerbosityLevelInvalid::ErrorVerbosityLevelInvalid(const std::string& verb)
    : std::runtime_error(fmt::format("Verbosity level is invalid: \"{:s}\". Possible verbosity levels are: {}", verb,
        Logger::getVerbosityLevels())) {}
