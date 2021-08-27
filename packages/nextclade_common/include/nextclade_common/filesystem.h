#pragma once

// clang-format off
#if ((defined(_MSVC_LANG) && _MSVC_LANG >= 201703L) || (defined(__cplusplus) && __cplusplus >= 201703L)) && defined(__has_include)
  #if __has_include(<filesystem>) && (!defined(__MAC_OS_X_VERSION_MIN_REQUIRED) || __MAC_OS_X_VERSION_MIN_REQUIRED >= 101500)
    #define GHC_USE_STD_FS
  #endif
#endif
// clang-format on

#ifdef GHC_USE_STD_FS
#include <filesystem>
#else
#include <ghc/filesystem.hpp>
#endif

namespace fs {
#ifdef GHC_USE_STD_FS
  using namespace std::filesystem;
#else
  using namespace ghc::filesystem;
#endif

  [[nodiscard]] inline bool is_regular_file_or_symlink(const path& pathStr) {
    return is_regular_file(pathStr) || is_symlink(pathStr);
  }
}// namespace fs
