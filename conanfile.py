import os
import re
import sys

from conans.client.runner import ConanRunner

THIS_DIR = os.path.dirname(os.path.realpath(__file__))
PROJECT_ROOT_DIR = THIS_DIR

sys.path.append(os.path.join(THIS_DIR, "scripts", "lib"))

from conans import ConanFile
from conans.tools import cpu_count
from dotenv import dotenv_values

from get_machine_info import get_machine_info
from is_ci import check_is_ci

os.environ = {
  **os.environ,
  **dotenv_values(".env.example"),
  **dotenv_values(".env"),
}

is_ci = check_is_ci()

runner = ConanRunner(print_commands_to_output=True)


def run(command, output=True, log_filepath=None, cwd=None, subprocess=False):
  command = re.sub(r'\s+', ' ', command).strip()
  runner(command, output, log_filepath, cwd, subprocess)


PROJECT_NAME = "nextclade"
BUILD_PREFIX = ""
BUILD_SUFFIX = ""
CMAKE_BUILD_TYPE = os.environ["CMAKE_BUILD_TYPE"]

# Emscripten SDK
NEXTCLADE_EMSDK_VERSION_DEFAULT = "2.0.6"
NEXTCLADE_EMSDK_VERSION = os.environ["NEXTCLADE_EMSDK_VERSION"]
NEXTCLADE_EMSDK_DIR = os.environ["NEXTCLADE_EMSDK_DIR"]
NEXTCLADE_EMSDK_USE_CACHE = os.environ["NEXTCLADE_EMSDK_USE_CACHE"]
if NEXTCLADE_EMSDK_USE_CACHE:
  NEXTCLADE_EMSDK_CACHE = os.path.join(PROJECT_ROOT_DIR, ".cache", ".emscripten",
                                       f"emsdk_cache-{NEXTCLADE_EMSDK_VERSION}")

NEXTCLADE_BUILD_WASM = os.environ["NEXTCLADE_BUILD_WASM"]
if NEXTCLADE_BUILD_WASM:
  # WASM Debug build is too slow, even for dev purposes
  CMAKE_BUILD_TYPE = "Release"

machine_info = get_machine_info()
BUILD_OS = machine_info.BUILD_OS
HOST_OS = machine_info.HOST_OS
BUILD_ARCH = machine_info.BUILD_ARCH
HOST_ARCH = machine_info.HOST_ARCH
CROSS = machine_info.CROSS

# Minimum target version of macOS. End up in `-mmacosx-version-min=` flag of AppleClang
OSX_MIN_VER = "10.12"

# Deduce conan build type from cmake build type
CONAN_BUILD_TYPE = CMAKE_BUILD_TYPE
if CMAKE_BUILD_TYPE in ["Debug", "Release", "RelWithDebInfo", "MinSizeRelease"]:
  CONAN_BUILD_TYPE = CMAKE_BUILD_TYPE
elif CMAKE_BUILD_TYPE in ["ASAN", "MSAN", "TSAN", "UBSAN"]:
  CONAN_BUILD_TYPE = "RelWithDebInfo"
else:
  CONAN_BUILD_TYPE = "Release"

# TODO: use this from Python somehow
ADDITIONAL_PATH = f"{PROJECT_ROOT_DIR}/3rdparty/binutils/bin:{PROJECT_ROOT_DIR}/3rdparty/gcc/bin:{PROJECT_ROOT_DIR}/3rdparty/llvm/bin"
PATH = f"{ADDITIONAL_PATH}${{PATH:+:$PATH}}"

# Clang
USE_CLANG = 0
USE_LIBCPP = 0

# Clang Analyzer
USE_CLANG_ANALYZER = 0
CLANG_ANALYZER = ""
if USE_CLANG_ANALYZER:
  CLANG_ANALYZER = "scan-build -v --keep-going -o ${PROJECT_ROOT_DIR}/.reports/clang-analyzer"
  os.makedirs(f"{PROJECT_ROOT_DIR}/.reports/clang-analyzer", exist_ok=True)
  USE_CLANG = 1

INSTALL_DIR = f"{PROJECT_ROOT_DIR}/.out"

EMCMAKE = ""
EMMAKE = ""

CMAKE_VERBOSE_MAKEFILE = 0
CMAKE_COLOR_MAKEFILE = 1

# Whether to build a standalone static executable
NEXTALIGN_STATIC_BUILD = CMAKE_BUILD_TYPE == "Release" and not CMAKE_BUILD_TYPE in ["ASAN", "MSAN", "TSAN", "UBSAN"]

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

CONAN_COMPILER_SETTINGS = ""

CONAN_ARCH_SETTINGS = f"-s arch={HOST_ARCH}"
if HOST_OS == "MacOS" and HOST_ARCH == "arm64":
  CONAN_ARCH_SETTINGS = "-s arch=armv8"

if HOST_OS == "MacOS":
  CONAN_COMPILER_SETTINGS = f"{CONAN_COMPILER_SETTINGS} -s os.version={OSX_MIN_VER}"

EMSDK_CLANG_VERSION = os.environ["EMSDK_CLANG_VERSION"]
CONANFILE = f"{PROJECT_ROOT_DIR}/conanfile.py"
CONAN_WASM_PROFILE = f"{PROJECT_ROOT_DIR}/config/conan/conan_profile_emscripten_wasm.txt"
NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS = ""
if NEXTCLADE_BUILD_WASM:
  CONAN_COMPILER_SETTINGS = f"\
    --profile={CONAN_WASM_PROFILE} \
    -s compiler=clang \
    -s compiler.version={EMSDK_CLANG_VERSION} \
  "

  NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS = " \
    -frtti \
    -fexceptions \
    --bind \
    --source-map-base './' \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s WASM=1 \
    -s DISABLE_EXCEPTION_CATCHING=2 \
    -s DEMANGLE_SUPPORT=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MALLOC=emmalloc \
    -s ENVIRONMENT=worker \
    -s DYNAMIC_EXECUTION=0 \
  "

  BUILD_SUFFIX = f"{BUILD_SUFFIX:-}-Wasm"
  INSTALL_DIR = f"{PROJECT_ROOT_DIR}/packages/web/src/generated/"

  EMCMAKE = "emcmake"
  EMMAKE = "emmake"

  NEXTALIGN_BUILD_CLI = 0
  NEXTALIGN_BUILD_BENCHMARKS = 0
  NEXTALIGN_BUILD_TESTS = 0
  NEXTCLADE_BUILD_CLI = 0
  NEXTCLADE_BUILD_BENCHMARKS = 0
  NEXTCLADE_BUILD_TESTS = 0
  NEXTCLADE_CLI_BUILD_TESTS = 0

CONAN_STATIC_BUILD_FLAGS = "\
  -o cpr:with_ssl=openssl \
  -o libcurl:with_c_ares=True \
  -o libcurl:with_ssl=openssl \
  -o libcurl:with_zlib=True \
  -o poco:enable_active_record=False \
  -o poco:enable_apacheconnector=False \
  -o poco:enable_cppparser=False \
  -o poco:enable_crypto=False \
  -o poco:enable_data=False \
  -o poco:enable_data_mysql=False \
  -o poco:enable_data_odbc=False \
  -o poco:enable_data_postgresql=False \
  -o poco:enable_data_sqlite=False \
  -o poco:enable_encodings=False \
  -o poco:enable_json=False \
  -o poco:enable_jwt=False \
  -o poco:enable_mongodb=False \
  -o poco:enable_net=False \
  -o poco:enable_netssl=False \
  -o poco:enable_pagecompiler=False \
  -o poco:enable_pagecompiler_file2page=False \
  -o poco:enable_pdf=False \
  -o poco:enable_pocodoc=False \
  -o poco:enable_redis=False \
  -o poco:enable_sevenzip=False \
  -o poco:enable_util=False \
  -o poco:enable_xml=False \
  -o poco:enable_zip=False \
\
  -o boost:header_only=True \
  -o fmt:header_only=True \
"

CONAN_TBB_STATIC_BUILD_FLAGS = ""

if NEXTALIGN_STATIC_BUILD and HOST_OS == "Linux" and not NEXTCLADE_BUILD_WASM:
  TARGET_TRIPLET = "x86_64-linux-gnu"

  CONAN_STATIC_BUILD_FLAGS = f"\
    {CONAN_STATIC_BUILD_FLAGS} \
    -o c-ares:shared=False \
    -o cpr:shared=False \
    -o gtest:shared=False \
    -o libcurl:shared=False \
    -o openssl:shared=False \
    -o tbb:shared=False \
    -o zlib:shared=False \
    -o poco:shared=False \
  "

  CONAN_TBB_STATIC_BUILD_FLAGS = "-o shared=False"

  # Download libmusl-based GCC
  GCC_DIR = f"{PROJECT_ROOT_DIR}/.cache/gcc"
  GCC_URL = "https://github.com/ivan-aksamentov/musl-cross-make/releases/download/v1/gcc-x86_64-linux-musl.tar.gz"
  if not os.path.isfile(f"{GCC_DIR}/bin/x86_64-linux-musl-gcc"):
    os.makedirs(GCC_DIR, exist_ok=True)
    run(f"curl -fsSL '{GCC_URL}' | tar xfz - --strip-components=1", cwd=GCC_DIR)
    # download(GCC_URL, GCC_DIR)

  PATH = "${GCC_DIR}/bin:${PATH}"

  TARGET_TRIPLET = "x86_64-linux-musl"
  CONAN_CMAKE_SYSROOT = "${GCC_DIR}"
  CONAN_CMAKE_FIND_ROOT_PATH = "${GCC_DIR}"
  LD_LIBRARY_PATH = "${GCC_DIR}/x86_64-linux-musl/lib:${LD_LIBRARY_PATH:-}"

  # pushd "${GCC_DIR}/bin" >/dev/null
  #   if [ ! -e "gcc" ]    ; then ln -s "${TARGET_TRIPLET}-gcc" gcc           ;fi
  #   if [ ! -e "g++" ]    ; then ln -s "${TARGET_TRIPLET}-g++" g++           ;fi
  #   if [ ! -e "ar" ]     ; then ln -s "${TARGET_TRIPLET}-gcc-ar" ar         ;fi
  #   if [ ! -e "nm" ]     ; then ln -s "${TARGET_TRIPLET}-gcc-nm" nm         ;fi
  #   if [ ! -e "ranlib" ] ; then ln -s "${TARGET_TRIPLET}-gcc-ranlib" ranlib ;fi
  #   if [ ! -e "as" ]     ; then ln -s "${TARGET_TRIPLET}-as" as             ;fi
  #   if [ ! -e "strip" ]  ; then ln -s "${TARGET_TRIPLET}-strip" strip       ;fi
  #   if [ ! -e "ld" ]     ; then ln -s "${TARGET_TRIPLET}-ld" ld             ;fi
  #   # if [ ! -e "ldd"     ]; then ln -s "ld" ldd                              ;fi
  #   if [ ! -e "objcopy" ]; then ln -s "${TARGET_TRIPLET}-objcopy" objcopy   ;fi
  #   if [ ! -e "objdump" ]; then ln -s "${TARGET_TRIPLET}-objdump" objdump   ;fi
  # popd >/dev/null

  CHOST = f"{TARGET_TRIPLET}"
  CC = f"{GCC_DIR}/bin/gcc"
  CXX = f"{GCC_DIR}/bin/g++"
  AR = f"{GCC_DIR}/bin/ar"
  NM = f"{GCC_DIR}/bin/nm"
  RANLIB = f"{GCC_DIR}/bin/ranlib"
  AS = f"{GCC_DIR}/bin/as"
  STRIP = f"{GCC_DIR}/bin/strip"
  LD = f"{GCC_DIR}/bin/ld"
  OBJCOPY = f"{GCC_DIR}/bin/objcopy"
  OBJDUMP = f"{GCC_DIR}/bin/objdump"

  CFLAGS = "-D__MUSL__"
  CXXFLAGS = "-D__MUSL__"
  CMAKE_C_FLAGS = "${CFLAGS:-}"
  CMAKE_CXX_FLAGS = "${CXXFLAGS:-}"

  CMAKE_TOOLCHAIN_FILE = "${PROJECT_ROOT_DIR}/config/cmake/musl.toolchain.cmake"
  CONAN_CMAKE_TOOLCHAIN_FILE = "${CMAKE_TOOLCHAIN_FILE}"

  AC_CANONICAL_HOST = TARGET_TRIPLET

  CONAN_STATIC_BUILD_FLAGS = f"\
    {CONAN_STATIC_BUILD_FLAGS} \
    -e PATH={PATH} \
    -e CHOST={CHOST} \
    -e HOST={TARGET_TRIPLET} \
    -e AC_CANONICAL_HOST={TARGET_TRIPLET} \
    -e CC={CC} \
    -e CXX={CXX} \
    -e AS={AS} \
    -e AR={AR} \
    -e RANLIB={RANLIB} \
    -e STRIP={STRIP} \
    -e LD={LD} \
    -e NM={NM} \
    -e OBJCOPY={OBJCOPY} \
    -e OBJDUMP={OBJDUMP} \
    -e STRIP={STRIP} \
    -s os=Linux \
    -s arch=x86_64 \
    -s compiler=gcc \
    -s compiler.libcxx=libstdc++11 \
  "

  BUILD_SUFFIX = "{BUILD_SUFFIX:-}-Static"

if HOST_OS == "MacOS":
  # Avoid compiler error:
  # error: aligned deallocation function of type 'void (void *, std::size_t, std::align_val_t) noexcept' is only available on macOS 10.14 or newer
  # note: if you supply your own aligned allocation functions, use -faligned-allocation to silence this diagnostic
  CMAKE_CXX_FLAGS = f"{CMAKE_CXX_FLAGS} -faligned-allocation"

if HOST_OS == "MacOS":
  ADDITIONAL_PATH = "/local/opt/m4/bin"
  PATH = f"{ADDITIONAL_PATH}:{PATH}"

BUILD_TYPE_EXTENDED = f"{BUILD_PREFIX}{CMAKE_BUILD_TYPE}{BUILD_SUFFIX}"
CONAN_USER_HOME = f"{PROJECT_ROOT_DIR}/.cache/{BUILD_TYPE_EXTENDED}"
CCACHE_DIR = f"{PROJECT_ROOT_DIR}/.cache/{BUILD_TYPE_EXTENDED}/.ccache"
BUILD_DIR = f"{PROJECT_ROOT_DIR}/.build/{BUILD_TYPE_EXTENDED}"

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
    if self.settings.arch == "wasm":
      for dep in NEXTCLADE_WASM_DEPS:
        self.requires(dep)
    else:
      for dep in NEXTCLADE_CLI_DEPS:
        self.requires(dep)

  def build(self):
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


if __name__ == '__main__':
  conan_install_command = f"""
      conan install "{CONANFILE}" \
      -s build_type="{CONAN_BUILD_TYPE}" \
      {CONAN_ARCH_SETTINGS} \
      {CONAN_COMPILER_SETTINGS} \
      {CONAN_STATIC_BUILD_FLAGS} \
      --build missing \
    """

  run(conan_install_command)
