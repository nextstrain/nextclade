#include <fmt/format.h>

#include <array>
#include <vector>


#define debug_trace(format_string, ...) // fmt::print(format_string, __VA_ARGS__)

template<typename T>
struct fmt::formatter<std::vector<T>> {
  constexpr auto parse(fmt::format_parse_context& ctx) {
    return ctx.begin();
  }

  template<typename FormatContext>
  auto format(const std::vector<T>& vec, FormatContext& ctx) {
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
