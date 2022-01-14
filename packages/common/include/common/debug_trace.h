#pragma once

#include <common/safe_vector.h>
#include <fmt/format.h>

#include <array>


#define NOOP ({ (void) 0; })

// If `ENABLE_DEBUG_TRACE` is set to `1`, the `debug_trace()` statements throughout the codebase
// will be printing messages about the internal workings to the terminal and browser console.
// Useful for algorithm development.
// At the same time you may want to add `--jobs=1` and `--in-order` flags to the Nextalign and Nextclade
// command line invocations (below), to make the console traces more readable.
// If disabled, `debug_trace()` evaluates to a no-op, a dummy statement which should be
// optimized away from the executable by the compiler.
// Enabling `debug_trace()` incurs significant performance penalty. Do not enable in production!
// It may also crash in the browser, if there are too many console messages.
#ifndef ENABLE_DEBUG_TRACE
#define ENABLE_DEBUG_TRACE 0
#endif

#if ENABLE_DEBUG_TRACE == 1
#define debug_trace(format_string, ...) ({ fmt::print(format_string, __VA_ARGS__); })
#else
#define debug_trace(format_string, ...) NOOP
#endif

template<typename T>
struct fmt::formatter<safe_vector<T>> {
  constexpr auto parse(fmt::format_parse_context& ctx) {
    return ctx.begin();
  }

  template<typename FormatContext>
  auto format(const safe_vector<T>& vec, FormatContext& ctx) {
    for (const auto& item : vec) {
      fmt::format_to(ctx.out(), "  - {:}\n", item);
    }
    return ctx.out();
  }
};

template<typename T, size_t N>
struct fmt::formatter<std::array<T, N>> {
  constexpr auto parse(fmt::format_parse_context& ctx) {
    return ctx.begin();
  }

  template<typename FormatContext>
  auto format(const std::array<T, N>& arr, FormatContext& ctx) {
    fmt::format_to(ctx.out(), "[");
    for (int i = 0; i < arr.size(); ++i) {
      fmt::format_to(ctx.out(), " {:}", arr[i]);
      if (i < arr.size() - 1) {
        fmt::format_to(ctx.out(), ",");
      }
    }
    fmt::format_to(ctx.out(), " ]");
    return ctx.out();
  }
};
