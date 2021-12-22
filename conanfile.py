import re

from conans import ConanFile
from conans.tools import cpu_count

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
    "cmake",
    "cmake_paths",
    "cmake_find_package",
    "txt",
  ]

  def requirements(self):
    print(">>>>>>>>>>>> REQUIREMENTS <<<<<<<<<<<<<< ")
    if self.settings.arch == "wasm":
      for dep in NEXTCLADE_WASM_DEPS:
        self.requires(dep)
    else:
      for dep in NEXTCLADE_CLI_DEPS:
        self.requires(dep)

  def build(self):
    CLANG_ANALYZER = ""
    EMCMAKE = ""
    EMMAKE = ""
    HOST_ARCH = "x86_64"
    OSX_MIN_VER = "10.12"

    CMAKE_VERBOSE_MAKEFILE = 0
    CMAKE_COLOR_MAKEFILE = 1
    NEXTALIGN_STATIC_BUILD = self.settings.build_type == "Release"
    NEXTALIGN_BUILD_BENCHMARKS = 0
    NEXTALIGN_BUILD_TESTS = 0
    NEXTCLADE_BUILD_TESTS = 0
    NEXTCLADE_CLI_BUILD_TESTS = 0

    NEXTCLADE_BUILD_WASM = 0
    NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS = ""

    NEXTALIGN_BUILD_CLI = 1
    NEXTCLADE_BUILD_CLI = 1

    DATA_FULL_DOMAIN = ""
    ENABLE_DEBUG_TRACE = 0

    MORE_CMAKE_FLAGS = ""

    if NEXTALIGN_STATIC_BUILD:
      COMPILER_FLAGS = "-fno-builtin-malloc -fno-builtin-calloc -fno-builtin-realloc -fno-builtin-free"
      CFLAGS = f"-D__MUSL__ {COMPILER_FLAGS}"
      CXXFLAGS = f"-D__MUSL__ {COMPILER_FLAGS}"
      CMAKE_C_FLAGS = f"'{CFLAGS}'"
      CMAKE_CXX_FLAGS = f"'{CXXFLAGS}'"
    else:
      COMPILER_FLAGS = ""
      CFLAGS = ""
      CXXFLAGS = ""
      CMAKE_C_FLAGS = ""
      CMAKE_CXX_FLAGS = ""

    print("self.install_folder", self.install_folder)

    if self.should_configure:
      configure_command = f"""
        {CLANG_ANALYZER} {EMCMAKE} cmake "{self.source_folder}" \
        -DCMAKE_MODULE_PATH="{self.build_folder}" \
        -DCMAKE_INSTALL_PREFIX="{self.install_folder}" \
        -DCMAKE_EXPORT_COMPILE_COMMANDS=1 \
        -DCMAKE_BUILD_TYPE="{self.settings.build_type}" \
        -DCMAKE_VERBOSE_MAKEFILE={CMAKE_VERBOSE_MAKEFILE} \
        -DCMAKE_COLOR_MAKEFILE={CMAKE_COLOR_MAKEFILE} \
        -DNEXTALIGN_STATIC_BUILD={NEXTALIGN_STATIC_BUILD} \
        -DNEXTALIGN_BUILD_BENCHMARKS={NEXTALIGN_BUILD_BENCHMARKS} \
        -DNEXTALIGN_BUILD_TESTS={NEXTALIGN_BUILD_TESTS} \
        -DNEXTALIGN_MACOS_ARCH="{HOST_ARCH}" \
        -DCMAKE_OSX_ARCHITECTURES="{HOST_ARCH}" \
        -DCMAKE_OSX_DEPLOYMENT_TARGET="{OSX_MIN_VER}" \
        -DNEXTCLADE_STATIC_BUILD={NEXTALIGN_STATIC_BUILD} \
        -DNEXTALIGN_BUILD_CLI={NEXTALIGN_BUILD_CLI} \
        -DNEXTALIGN_BUILD_BENCHMARKS={NEXTALIGN_BUILD_BENCHMARKS} \
        -DNEXTALIGN_BUILD_TESTS={NEXTALIGN_BUILD_TESTS} \
        -DNEXTCLADE_BUILD_CLI={NEXTCLADE_BUILD_CLI} \
        -DNEXTCLADE_BUILD_TESTS={NEXTCLADE_BUILD_TESTS} \
        -DNEXTCLADE_CLI_BUILD_TESTS={NEXTCLADE_CLI_BUILD_TESTS} \
        -DNEXTCLADE_BUILD_WASM={NEXTCLADE_BUILD_WASM} \
        -DNEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS="{NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS}" \
        -DBUILD_SHARED_LIBS="{NEXTALIGN_STATIC_BUILD}" \
        -DDATA_FULL_DOMAIN={DATA_FULL_DOMAIN} \
        -DENABLE_DEBUG_TRACE="{ENABLE_DEBUG_TRACE}" \
        -DCMAKE_C_FLAGS={CMAKE_C_FLAGS} \
        -DCMAKE_CXX_FLAGS={CMAKE_CXX_FLAGS} \
        {MORE_CMAKE_FLAGS}
       """
      configure_command = re.sub(r'\s+', ' ', configure_command)
      print(configure_command)
      self.run(configure_command)

    if self.should_build:
      build_command = f"""
        {CLANG_ANALYZER} {EMMAKE} cmake --build '{self.build_folder}' --config '{self.settings.build_type}' -- --jobs={cpu_count()}
      """
      build_command = re.sub(r'\s+', ' ', build_command)
      print(build_command)
      self.run(build_command)

    if self.should_install:
      install_command = f"""
        cmake --install '{self.build_folder}' --config '{self.settings.build_type}' --strip \
        -DCMAKE_INSTALL_PREFIX="{self.install_folder}" \
      """
      install_command = re.sub(r'\s+', ' ', install_command)
      print(install_command)
