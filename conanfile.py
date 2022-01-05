"""
Implements build system for C++ parts of the project.
"""

import os
import sys

from conans import ConanFile, CMake
from dotenv import dotenv_values

THIS_DIR = os.path.dirname(os.path.realpath(__file__))
PROJECT_ROOT_DIR = THIS_DIR

sys.path.append(os.path.join(THIS_DIR, "scripts", "lib"))
sys.path.append(os.path.join(THIS_DIR, "scripts", "build"))
sys.path.append(os.path.join(THIS_DIR, "scripts", "build", "lib"))

from build import run_build
from codegen import run_codegen
from configure import configure_build
from get_machine_info import get_machine_info
from install_deps import install_deps
from is_ci import check_is_ci
from is_truthy import is_truthy
from namedtuple import dict_to_namedtuple
from parse_args import parse_args, COMMANDS
from run_command import run, Shell, join_path_var

# Combine system environment variables with variables read from .env files
os.environ = {
  **os.environ,
  **dotenv_values(".env.example"),
  **dotenv_values(".env"),
}


def configure(args=None):
  """
  Prepares variables used in subsequence build steps,
  based on shell environment variables and command line arguments. Creates a
  'Shell' object that is used to run external shell commands.
  """

  if args is None:
    args = {}

  PATH = []
  LD_LIBRARY_PATH = []

  # Are we in any of continuous integration platforms?
  IS_CI = check_is_ci()

  BUILD_PREFIX = ""
  BUILD_SUFFIX = ""
  CMAKE_BUILD_TYPE = os.environ.get("CMAKE_BUILD_TYPE") or (
    "Release" if args.get("release") else "Debug"
  )

  # Emscripten SDK
  NEXTCLADE_EMSDK_VERSION = os.environ["NEXTCLADE_EMSDK_VERSION"]
  EMSDK_CLANG_VERSION = os.environ["EMSDK_CLANG_VERSION"]
  NEXTCLADE_EMSDK_DIR = os.path.join(PROJECT_ROOT_DIR, os.environ["NEXTCLADE_EMSDK_DIR"])
  NEXTCLADE_EMSDK_USE_CACHE = is_truthy(os.environ.get("NEXTCLADE_EMSDK_USE_CACHE"))
  NEXTCLADE_EMSDK_CACHE = os.path.join(
    PROJECT_ROOT_DIR, ".cache", ".emscripten",
    f"emsdk_cache-{NEXTCLADE_EMSDK_VERSION}"
  )

  NEXTCLADE_BUILD_WASM = is_truthy(args.get('wasm')) or is_truthy(os.environ.get("NEXTCLADE_BUILD_WASM"))
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

  PATH.extend([
    NEXTCLADE_EMSDK_DIR,
    f"{PROJECT_ROOT_DIR}/3rdparty/binutils/bin",
    f"{PROJECT_ROOT_DIR}/3rdparty/gcc/bin",
    f"{PROJECT_ROOT_DIR}/3rdparty/llvm/bin",
  ])

  # Clang
  USE_CLANG = is_truthy(os.environ.get('USE_CLANG'))
  USE_LIBCPP = is_truthy(os.environ.get('USE_LIBCPP'))

  # Clang Analyzer
  USE_CLANG_ANALYZER = is_truthy(os.environ.get('USE_CLANG_ANALYZER'))
  CLANG_ANALYZER = ""
  if USE_CLANG_ANALYZER:
    USE_CLANG = True
    CLANG_ANALYZER = f"scan-build -v --keep-going -o {PROJECT_ROOT_DIR}/.reports/clang-analyzer"
    os.makedirs(f"{PROJECT_ROOT_DIR}/.reports/clang-analyzer", exist_ok=True)

  INSTALL_DIR = f"{PROJECT_ROOT_DIR}/.out"

  CMAKE_VERBOSE_MAKEFILE = 0
  CMAKE_COLOR_MAKEFILE = 1

  # Whether to build a standalone static executable
  NEXTALIGN_STATIC_BUILD = \
    is_truthy(os.environ.get('NEXTALIGN_STATIC_BUILD')) \
    or (is_truthy(args.get("static"))) \
    or (
        CMAKE_BUILD_TYPE == "Release"
        and not CMAKE_BUILD_TYPE in ["ASAN", "MSAN", "TSAN", "UBSAN"]
        and not NEXTCLADE_BUILD_WASM
    )

  NEXTALIGN_BUILD_BENCHMARKS = 0
  NEXTALIGN_BUILD_TESTS = 0
  NEXTCLADE_BUILD_TESTS = 0
  NEXTCLADE_CLI_BUILD_TESTS = 0

  NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS = ""

  NEXTALIGN_BUILD_CLI = 1
  NEXTCLADE_BUILD_CLI = 1

  DATA_FULL_DOMAIN = os.environ['DATA_FULL_DOMAIN']
  ENABLE_DEBUG_TRACE = is_truthy(os.environ.get('ENABLE_DEBUG_TRACE'))

  COMPILER_FLAGS = ""
  CFLAGS = ""
  CXXFLAGS = ""
  CMAKE_C_FLAGS = ""
  CMAKE_CXX_FLAGS = ""
  TOOLCHAIN_CONFIG = {}
  CONAN_COMPILER_SETTINGS = ""

  CONAN_ARCH_SETTINGS = f"-s arch={HOST_ARCH}"
  if HOST_OS == "MacOS" and HOST_ARCH == "arm64":
    CONAN_ARCH_SETTINGS = "-s arch=armv8"

  if HOST_OS == "MacOS":
    CONAN_COMPILER_SETTINGS = f"{CONAN_COMPILER_SETTINGS} -s os.version={OSX_MIN_VER}"

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

  CONANFILE = f"{PROJECT_ROOT_DIR}/conanfile.py"

  if NEXTCLADE_BUILD_WASM:
    TOOLCHAIN_ROOT_DIR = f"{NEXTCLADE_EMSDK_DIR}/upstream"
    TARGET_TRIPLET = "wasm32-unknown-emscripten"
    CONAN_CMAKE_SYSROOT = TOOLCHAIN_ROOT_DIR
    CONAN_CMAKE_FIND_ROOT_PATH = TOOLCHAIN_ROOT_DIR

    PATH.extend([f"{TOOLCHAIN_ROOT_DIR}/bin"])
    LD_LIBRARY_PATH.extend([f"{TOOLCHAIN_ROOT_DIR}/lib"])

    CC = f"{TOOLCHAIN_ROOT_DIR}/bin/clang"
    CXX = f"{TOOLCHAIN_ROOT_DIR}/bin/clang++"
    AR = f"{TOOLCHAIN_ROOT_DIR}/bin/llvm-ar"
    NM = f"{TOOLCHAIN_ROOT_DIR}/bin/llvm-nm"
    RANLIB = f"{TOOLCHAIN_ROOT_DIR}/bin/llvm-ranlib"
    AS = f"{TOOLCHAIN_ROOT_DIR}/bin/llvm-as"
    STRIP = f"{TOOLCHAIN_ROOT_DIR}/bin/llvm-strip"
    LD = f"{TOOLCHAIN_ROOT_DIR}/bin/lld"
    OBJCOPY = f"{TOOLCHAIN_ROOT_DIR}/bin/llvm-objcopy"
    OBJDUMP = f"{TOOLCHAIN_ROOT_DIR}/bin/llvm-objdump"

    CHOST = f"{TARGET_TRIPLET}"
    AC_CANONICAL_HOST = TARGET_TRIPLET
    CMAKE_C_COMPILER = CC
    CMAKE_CXX_COMPILER = CXX

    COMPILER_FLAGS = "-fno-builtin-malloc -fno-builtin-calloc -fno-builtin-realloc -fno-builtin-free"
    CFLAGS = f"{COMPILER_FLAGS}"
    CXXFLAGS = f"{COMPILER_FLAGS}"
    CMAKE_C_FLAGS = f"'{CFLAGS}'"
    CMAKE_CXX_FLAGS = f"'{CXXFLAGS}'"

    CMAKE_TOOLCHAIN_FILE = f"{TOOLCHAIN_ROOT_DIR}/emscripten/cmake/Modules/Platform/Emscripten.cmake"
    CONAN_CMAKE_TOOLCHAIN_FILE = CMAKE_TOOLCHAIN_FILE

    TOOLCHAIN_CONFIG = {
      "AR": AR,
      "AS": AS,
      "CC": CC,
      "CXX": CXX,
      "LD": LD,
      "NM": NM,
      "OBJCOPY": OBJCOPY,
      "OBJDUMP": OBJDUMP,
      "RANLIB": RANLIB,
      "STRIP": STRIP,

      "CHOST": CHOST,
      "AC_CANONICAL_HOST": AC_CANONICAL_HOST,

      "CMAKE_CXX_COMPILER": CMAKE_CXX_COMPILER,
      "CMAKE_C_COMPILER": CMAKE_C_COMPILER,
      "CMAKE_TOOLCHAIN_FILE": CMAKE_TOOLCHAIN_FILE,
      "CONAN_CMAKE_FIND_ROOT_PATH": CONAN_CMAKE_FIND_ROOT_PATH,
      "CONAN_CMAKE_SYSROOT": CONAN_CMAKE_SYSROOT,
      "CONAN_CMAKE_TOOLCHAIN_FILE": CONAN_CMAKE_TOOLCHAIN_FILE,
    }

    CONAN_STATIC_BUILD_FLAGS = f"\
      {CONAN_STATIC_BUILD_FLAGS} \
      -s os=Emscripten \
      -s arch=wasm \
      -s compiler=clang \
      -s compiler.libcxx=libc++ \
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

    BUILD_SUFFIX = f"{BUILD_SUFFIX}-Wasm"
    INSTALL_DIR = f"{PROJECT_ROOT_DIR}/packages/web/src/generated/"

    NEXTALIGN_BUILD_CLI = 0
    NEXTALIGN_BUILD_BENCHMARKS = 0
    NEXTALIGN_BUILD_TESTS = 0
    NEXTCLADE_BUILD_CLI = 0
    NEXTCLADE_BUILD_BENCHMARKS = 0
    NEXTCLADE_BUILD_TESTS = 0
    NEXTCLADE_CLI_BUILD_TESTS = 0

  elif NEXTALIGN_STATIC_BUILD and HOST_OS == "Linux":
    # Setup a custom GCC toolchain based on alternative C library called 'libmusl' (as opposed to GNU libc which is
    # the default on our build machines). This ensures fully static builds portable across various Linux distributions.
    TARGET_TRIPLET = "x86_64-linux-musl"
    TOOLCHAIN_ROOT_DIR = f"{PROJECT_ROOT_DIR}/.cache/gcc"
    CONAN_CMAKE_SYSROOT = TOOLCHAIN_ROOT_DIR
    CONAN_CMAKE_FIND_ROOT_PATH = TOOLCHAIN_ROOT_DIR

    PATH.extend([f"{TOOLCHAIN_ROOT_DIR}/bin"])
    LD_LIBRARY_PATH.extend([f"{TOOLCHAIN_ROOT_DIR}/x86_64-linux-musl/lib"])

    GCC_URL = "https://github.com/ivan-aksamentov/musl-cross-make/releases/download/v1/gcc-x86_64-linux-musl.tar.gz"
    if not os.path.exists(f"{TOOLCHAIN_ROOT_DIR}/bin/x86_64-linux-musl-gcc"):
      os.makedirs(TOOLCHAIN_ROOT_DIR, exist_ok=True)
      run(f"curl -fsSL '{GCC_URL}' | tar xfz - --strip-components=1", cwd=TOOLCHAIN_ROOT_DIR)

    CHOST = "unknown-linux-musl"
    AC_CANONICAL_HOST = "unknown-linux-musl"
    CC = f"{TOOLCHAIN_ROOT_DIR}/bin/{TARGET_TRIPLET}-gcc"
    CXX = f"{TOOLCHAIN_ROOT_DIR}/bin/{TARGET_TRIPLET}-g++"
    AR = f"{TOOLCHAIN_ROOT_DIR}/bin/{TARGET_TRIPLET}-ar"
    NM = f"{TOOLCHAIN_ROOT_DIR}/bin/{TARGET_TRIPLET}-nm"
    RANLIB = f"{TOOLCHAIN_ROOT_DIR}/bin/{TARGET_TRIPLET}-ranlib"
    AS = f"{TOOLCHAIN_ROOT_DIR}/bin/{TARGET_TRIPLET}-as"
    STRIP = f"{TOOLCHAIN_ROOT_DIR}/bin/{TARGET_TRIPLET}-strip"
    LD = f"{TOOLCHAIN_ROOT_DIR}/bin/{TARGET_TRIPLET}-ld"
    OBJCOPY = f"{TOOLCHAIN_ROOT_DIR}/bin/{TARGET_TRIPLET}-objcopy"
    OBJDUMP = f"{TOOLCHAIN_ROOT_DIR}/bin/{TARGET_TRIPLET}-objdump"

    CMAKE_C_COMPILER = CC
    CMAKE_CXX_COMPILER = CXX

    COMPILER_FLAGS = "-fno-builtin-malloc -fno-builtin-calloc -fno-builtin-realloc -fno-builtin-free"
    CFLAGS = f"-D__MUSL__ {COMPILER_FLAGS}"
    CXXFLAGS = f"-D__MUSL__ {COMPILER_FLAGS}"
    CMAKE_C_FLAGS = f"'{CFLAGS}'"
    CMAKE_CXX_FLAGS = f"'{CXXFLAGS}'"

    CMAKE_TOOLCHAIN_FILE = f"{PROJECT_ROOT_DIR}/config/cmake/musl.toolchain.cmake"
    CONAN_CMAKE_TOOLCHAIN_FILE = CMAKE_TOOLCHAIN_FILE

    TOOLCHAIN_CONFIG = {
      "AR": AR,
      "AS": AS,
      "CC": CC,
      "CXX": CXX,
      "LD": LD,
      "NM": NM,
      "OBJCOPY": OBJCOPY,
      "OBJDUMP": OBJDUMP,
      "RANLIB": RANLIB,
      "STRIP": STRIP,

      "CHOST": CHOST,
      "AC_CANONICAL_HOST": AC_CANONICAL_HOST,

      "CMAKE_CXX_COMPILER": CMAKE_CXX_COMPILER,
      "CMAKE_C_COMPILER": CMAKE_C_COMPILER,
      "CMAKE_TOOLCHAIN_FILE": CMAKE_TOOLCHAIN_FILE,
      "CONAN_CMAKE_FIND_ROOT_PATH": CONAN_CMAKE_FIND_ROOT_PATH,
      "CONAN_CMAKE_SYSROOT": CONAN_CMAKE_SYSROOT,
      "CONAN_CMAKE_TOOLCHAIN_FILE": CONAN_CMAKE_TOOLCHAIN_FILE,
    }

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
      -s os=Linux \
      -s arch=x86_64 \
      -s compiler=gcc \
      -s compiler.libcxx=libstdc++11 \
      -s libc=musl \
    "
    CONAN_TBB_STATIC_BUILD_FLAGS = "-o shared=False"

    BUILD_SUFFIX = f"{BUILD_SUFFIX}-Static"

  if HOST_OS == "MacOS":
    # Avoid compiler error:
    # error: aligned deallocation function of type 'void (void *, std::size_t, std::align_val_t) noexcept' is only available on macOS 10.14 or newer
    # note: if you supply your own aligned allocation functions, use -faligned-allocation to silence this diagnostic
    CMAKE_CXX_FLAGS = f"{CMAKE_CXX_FLAGS} -faligned-allocation"

  if HOST_OS == "MacOS":
    PATH.append("/local/opt/m4/bin")

  BUILD_TYPE_EXTENDED = f"{BUILD_PREFIX}{CMAKE_BUILD_TYPE}{BUILD_SUFFIX}"
  CONAN_USER_HOME = f"{PROJECT_ROOT_DIR}/.cache/{BUILD_TYPE_EXTENDED}"
  CCACHE_DIR = f"{PROJECT_ROOT_DIR}/.cache/{BUILD_TYPE_EXTENDED}/.ccache"
  BUILD_DIR = f"{PROJECT_ROOT_DIR}/.build/{BUILD_TYPE_EXTENDED}"

  PATH = join_path_var(PATH)
  LD_LIBRARY_PATH = join_path_var(LD_LIBRARY_PATH)

  config_dict = {
    "PROJECT_ROOT_DIR": PROJECT_ROOT_DIR,

    "IS_CI": IS_CI,

    "BUILD_OS": BUILD_OS,
    "HOST_OS": HOST_OS,
    "BUILD_ARCH": BUILD_ARCH,
    "HOST_ARCH": HOST_ARCH,
    "CROSS": CROSS,
    "OSX_MIN_VER": OSX_MIN_VER,

    "USE_CLANG": USE_CLANG,
    "CLANG_ANALYZER": CLANG_ANALYZER,
    "USE_CLANG_ANALYZER": USE_CLANG_ANALYZER,
    "USE_LIBCPP": USE_LIBCPP,

    "CMAKE_BUILD_TYPE": CMAKE_BUILD_TYPE,
    "CONAN_BUILD_TYPE": CONAN_BUILD_TYPE,

    "CFLAGS": CFLAGS,
    "CXXFLAGS": CXXFLAGS,
    "CMAKE_C_FLAGS": CMAKE_C_FLAGS,
    "CMAKE_CXX_FLAGS": CMAKE_CXX_FLAGS,
    "CMAKE_COLOR_MAKEFILE": CMAKE_COLOR_MAKEFILE,
    "CMAKE_VERBOSE_MAKEFILE": CMAKE_VERBOSE_MAKEFILE,

    "CONANFILE": CONANFILE,
    "CONAN_ARCH_SETTINGS": CONAN_ARCH_SETTINGS,
    "CONAN_COMPILER_SETTINGS": CONAN_COMPILER_SETTINGS,
    "CONAN_STATIC_BUILD_FLAGS": CONAN_STATIC_BUILD_FLAGS,
    "CONAN_TBB_STATIC_BUILD_FLAGS": CONAN_TBB_STATIC_BUILD_FLAGS,
    "CONAN_USER_HOME": CONAN_USER_HOME,

    "BUILD_DIR": BUILD_DIR,
    "CCACHE_DIR": CCACHE_DIR,
    "INSTALL_DIR": INSTALL_DIR,

    "NEXTALIGN_BUILD_BENCHMARKS": NEXTALIGN_BUILD_BENCHMARKS,
    "NEXTALIGN_BUILD_CLI": NEXTALIGN_BUILD_CLI,
    "NEXTALIGN_BUILD_TESTS": NEXTALIGN_BUILD_TESTS,
    "NEXTALIGN_STATIC_BUILD": NEXTALIGN_STATIC_BUILD,
    "NEXTCLADE_BUILD_CLI": NEXTCLADE_BUILD_CLI,
    "NEXTCLADE_BUILD_TESTS": NEXTCLADE_BUILD_TESTS,
    "NEXTCLADE_BUILD_WASM": NEXTCLADE_BUILD_WASM,
    "NEXTCLADE_CLI_BUILD_TESTS": NEXTCLADE_CLI_BUILD_TESTS,
    "NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS": NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS,
    "DATA_FULL_DOMAIN": DATA_FULL_DOMAIN,
    "ENABLE_DEBUG_TRACE": ENABLE_DEBUG_TRACE,

    "PATH": PATH,
    "LD_LIBRARY_PATH": LD_LIBRARY_PATH
  }

  config_dict.update(**TOOLCHAIN_CONFIG)

  if NEXTCLADE_BUILD_WASM:
    config_dict.update({
      "NEXTCLADE_EMSDK_CACHE": NEXTCLADE_EMSDK_CACHE,
      "NEXTCLADE_EMSDK_DIR": NEXTCLADE_EMSDK_DIR,
      "NEXTCLADE_EMSDK_USE_CACHE": NEXTCLADE_EMSDK_USE_CACHE,
      "NEXTCLADE_EMSDK_VERSION": NEXTCLADE_EMSDK_VERSION,
    })

  # Filter out 'None' values
  config_dict = dict(filter(lambda item: item[1] is not None, config_dict.items()))

  config = dict_to_namedtuple("BuildConfig", config_dict)
  shell = Shell(config=config, cwd=PROJECT_ROOT_DIR)
  return config, shell


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
  """
  Configures Conan C++ package manager
  """
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
  no_copy_source = True

  def requirements(self):
    """
    Dynamically adds packages names for Conan to consider during `conan install` invocation.
    """
    if self.settings.arch == "wasm":
      for dep in NEXTCLADE_WASM_DEPS:
        self.requires(dep)
    else:
      for dep in NEXTCLADE_CLI_DEPS:
        self.requires(dep)

  def build(self):
    """
    Runs when `conan build` command is issued. Configures and/or builds the C++ project.
    """

    config, shell = configure()

    cmake = CMake(self, parallel=True)
    cmake.definitions["BUILD_SHARED_LIBS"] = config.NEXTALIGN_STATIC_BUILD
    cmake.definitions["CMAKE_BUILD_TYPE"] = self.settings.build_type
    cmake.definitions["CMAKE_COLOR_MAKEFILE"] = config.CMAKE_COLOR_MAKEFILE
    cmake.definitions["CMAKE_CXX_FLAGS"] = config.CMAKE_CXX_FLAGS
    cmake.definitions["CMAKE_C_FLAGS"] = config.CMAKE_C_FLAGS
    cmake.definitions["CMAKE_EXPORT_COMPILE_COMMANDS"] = 1
    cmake.definitions["CMAKE_INSTALL_PREFIX"] = config.INSTALL_DIR
    cmake.definitions["CMAKE_MODULE_PATH"] = self.build_folder
    cmake.definitions["CMAKE_OSX_ARCHITECTURES"] = config.HOST_ARCH
    cmake.definitions["CMAKE_OSX_DEPLOYMENT_TARGET"] = config.OSX_MIN_VER
    cmake.definitions["CMAKE_VERBOSE_MAKEFILE"] = config.CMAKE_VERBOSE_MAKEFILE
    cmake.definitions["DATA_FULL_DOMAIN"] = config.DATA_FULL_DOMAIN
    cmake.definitions["ENABLE_DEBUG_TRACE"] = 1 if config.ENABLE_DEBUG_TRACE else 0
    cmake.definitions["NEXTALIGN_BUILD_BENCHMARKS"] = config.NEXTALIGN_BUILD_BENCHMARKS
    cmake.definitions["NEXTALIGN_BUILD_CLI"] = config.NEXTALIGN_BUILD_CLI
    cmake.definitions["NEXTALIGN_BUILD_TESTS"] = config.NEXTALIGN_BUILD_TESTS
    cmake.definitions["NEXTALIGN_MACOS_ARCH"] = config.HOST_ARCH
    cmake.definitions["NEXTALIGN_STATIC_BUILD"] = config.NEXTALIGN_STATIC_BUILD
    cmake.definitions["NEXTCLADE_BUILD_CLI"] = config.NEXTCLADE_BUILD_CLI
    cmake.definitions["NEXTCLADE_BUILD_TESTS"] = config.NEXTCLADE_BUILD_TESTS
    cmake.definitions["NEXTCLADE_BUILD_WASM"] = config.NEXTCLADE_BUILD_WASM
    cmake.definitions["NEXTCLADE_CLI_BUILD_TESTS"] = config.NEXTCLADE_CLI_BUILD_TESTS
    cmake.definitions["NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS"] = config.NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS
    cmake.definitions["NEXTCLADE_STATIC_BUILD"] = config.NEXTALIGN_STATIC_BUILD

    # Runs when `conan build` is invoked with `--configure` flag
    if self.should_configure:
      # Runs `cmake`, which generates the build makefiles
      cmake.configure()

    # Runs when `conan build` is invoked with `--build` flag
    if self.should_build:
      # Runs cmake-generated makefiles, which performs the actual compilation and linking
      cmake.build(args=["-j 20"])

      # Installs the freshly built binaries into the expected locations
      if self.settings.build_type == "Release":
        STRIP = "" if config.NEXTCLADE_BUILD_WASM else "--strip"
        shell(f"""
          cmake --install '{self.build_folder}' \
            --config '{self.settings.build_type}' \
            --prefix '{config.INSTALL_DIR}' \
            {STRIP} \
        """, cwd=self.build_folder)

      if config.NEXTCLADE_BUILD_WASM:
        # Patch WASM helper JS script, to make sure it plays well with our Webpack setup
        shell(
          f"sed -i 's/var _scriptDir = import.meta.url;/var _scriptDir = false;/g' '{config.INSTALL_DIR}/wasm/nextclade_wasm.js'"
        )


if __name__ == '__main__':
  args = parse_args()

  config, shell = configure(args)

  os.makedirs(config.BUILD_DIR, exist_ok=True)

  if len(args["commands"]) == 0:
    args["commands"] = COMMANDS

  # Configure build tools, install 3rd-party dependencies
  # and ensure they can be found by the subsequent steps
  if 'install_deps' in args["commands"]:
    install_deps(config, shell)

  # Generate autogenerated code
  if 'codegen' in args["commands"]:
    run_codegen(config, shell)

  # Configure project build system and prepare makefiles
  if 'configure' in args["commands"]:
    configure_build(config, shell)

  # Run makefiles, compile and link binaries and copy them into the final location
  if 'build' in args["commands"]:
    run_build(config, shell)
