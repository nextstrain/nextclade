from conans import ConanFile
from conans.tools import os_info

print({
  "is_linux": os_info.is_linux,
  "is_windows": os_info.is_windows,
  "is_macos": os_info.is_macos,
  "linux_distro": os_info.linux_distro,
})

NEXTCLADE_WASM_DEPS = [
  "boost/1.75.0",
  "fast-cpp-csv-parser/20191004",
  "fmt/7.1.3",
  "ms-gsl/3.1.0",
  "neargye-semver/0.3.0",
]

NEXTCLADE_CLI_DEPS = NEXTCLADE_WASM_DEPS + [
  "benchmark/1.5.2",
  "c-ares/1.17.1@local/stable",
  "cli11/1.9.1",
  "cxxopts/2.2.1",
  "date/3.0.1",
  "ghc-filesystem/1.4.0",
  "gtest/1.10.0",
  "jemalloc/5.2.1@local/stable",
  "libcurl/7.77.0@local/stable",
  "openssl/1.1.1k@local/stable",
  "poco/1.11.0@local/stable",
  "tbb/2021.3.0@local/stable",
  "zlib/1.2.11@local/stable",
]


class TheConanFile(ConanFile):
  name = "nextclade"
  version = "1.7.0"
  settings = "os", "compiler", "build_type", "arch"
  options = {
    "shared": [True, False],
    "build_wasm": [True, False]
  }
  default_options = {
    "shared": False,
    "build_wasm": False,
  }
  generators = [
    "cmake_find_package",
  ]

  def requirements(self):
    if self.settings.arch == "wasm":
      for dep in NEXTCLADE_WASM_DEPS:
        self.requires(dep)
    else:
      for dep in NEXTCLADE_CLI_DEPS:
        self.requires(dep)
