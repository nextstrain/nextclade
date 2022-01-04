import os
import sys

from conans import ConanFile, CMake
from dotenv import dotenv_values

THIS_DIR = os.path.dirname(os.path.realpath(__file__))
PROJECT_ROOT_DIR = THIS_DIR

sys.path.append(os.path.join(THIS_DIR, "scripts", "lib"))

from get_machine_info import get_machine_info
from is_ci import check_is_ci
from is_truthy import is_truthy
from namedtuple import dict_to_namedtuple
from run_command import run, Shell, join_path_var, run_and_get_stdout

os.environ = {
  **os.environ,
  **dotenv_values(".env.example"),
  **dotenv_values(".env"),
}

is_ci = check_is_ci()


def configure():
  PATH = []
  LD_LIBRARY_PATH = []

  BUILD_PREFIX = ""
  BUILD_SUFFIX = ""
  CMAKE_BUILD_TYPE = os.environ["CMAKE_BUILD_TYPE"]

  # Emscripten SDK
  NEXTCLADE_EMSDK_VERSION = os.environ["NEXTCLADE_EMSDK_VERSION"]
  EMSDK_CLANG_VERSION = os.environ["EMSDK_CLANG_VERSION"]
  NEXTCLADE_EMSDK_DIR = os.path.join(PROJECT_ROOT_DIR, os.environ["NEXTCLADE_EMSDK_DIR"])
  NEXTCLADE_EMSDK_USE_CACHE = is_truthy(os.environ.get("NEXTCLADE_EMSDK_USE_CACHE"))
  NEXTCLADE_EMSDK_CACHE = os.path.join(PROJECT_ROOT_DIR, ".cache", ".emscripten",
                                       f"emsdk_cache-{NEXTCLADE_EMSDK_VERSION}")

  NEXTCLADE_BUILD_WASM = is_truthy(os.environ.get("NEXTCLADE_BUILD_WASM"))
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
  NEXTALIGN_STATIC_BUILD = is_truthy(os.environ.get('NEXTALIGN_STATIC_BUILD')) or (
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
    "BUILD_DIR": BUILD_DIR,
    "CCACHE_DIR": CCACHE_DIR,
    "CFLAGS": CFLAGS,
    "CLANG_ANALYZER": CLANG_ANALYZER,
    "CMAKE_COLOR_MAKEFILE": CMAKE_COLOR_MAKEFILE,
    "CMAKE_CXX_FLAGS": CMAKE_CXX_FLAGS,
    "CMAKE_C_FLAGS": CMAKE_C_FLAGS,
    "CMAKE_VERBOSE_MAKEFILE": CMAKE_VERBOSE_MAKEFILE,
    "CONANFILE": CONANFILE,
    "CONAN_ARCH_SETTINGS": CONAN_ARCH_SETTINGS,
    "CONAN_BUILD_TYPE": CONAN_BUILD_TYPE,
    "CONAN_COMPILER_SETTINGS": CONAN_COMPILER_SETTINGS,
    "CONAN_STATIC_BUILD_FLAGS": CONAN_STATIC_BUILD_FLAGS,
    "CONAN_TBB_STATIC_BUILD_FLAGS": CONAN_TBB_STATIC_BUILD_FLAGS,
    "CONAN_USER_HOME": CONAN_USER_HOME,
    "CXXFLAGS": CXXFLAGS,
    "DATA_FULL_DOMAIN": DATA_FULL_DOMAIN,
    "ENABLE_DEBUG_TRACE": ENABLE_DEBUG_TRACE,
    "HOST_ARCH": HOST_ARCH,
    "HOST_OS": HOST_OS,
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
    "OSX_MIN_VER": OSX_MIN_VER,
    "PATH": PATH,
  }

  if NEXTCLADE_BUILD_WASM:
    config_dict.update({
      "NEXTCLADE_EMSDK_CACHE": NEXTCLADE_EMSDK_CACHE,
      "NEXTCLADE_EMSDK_DIR": NEXTCLADE_EMSDK_DIR,
      "NEXTCLADE_EMSDK_USE_CACHE": NEXTCLADE_EMSDK_USE_CACHE,
      "NEXTCLADE_EMSDK_VERSION": NEXTCLADE_EMSDK_VERSION,
      "AC_CANONICAL_HOST": AC_CANONICAL_HOST,
      "AR": AR,
      "AS": AS,
      "CC": CC,
      "CHOST": CHOST,
      "CMAKE_CXX_COMPILER": CMAKE_CXX_COMPILER,
      "CMAKE_C_COMPILER": CMAKE_C_COMPILER,
      "CMAKE_TOOLCHAIN_FILE": "CMAKE_TOOLCHAIN_FILE",
      "CONAN_CMAKE_FIND_ROOT_PATH": CONAN_CMAKE_FIND_ROOT_PATH,
      "CONAN_CMAKE_SYSROOT": CONAN_CMAKE_SYSROOT,
      "CONAN_CMAKE_TOOLCHAIN_FILE": CONAN_CMAKE_TOOLCHAIN_FILE,
      "CXX": CXX,
      "LD": LD,
      "LD_LIBRARY_PATH": LD_LIBRARY_PATH,
      "NM": NM,
      "OBJCOPY": OBJCOPY,
      "OBJDUMP": OBJDUMP,
      "RANLIB": RANLIB,
      "STRIP": STRIP,
    })

  if NEXTALIGN_STATIC_BUILD:
    config_dict.update({
      "AC_CANONICAL_HOST": AC_CANONICAL_HOST,
      "AR": AR,
      "AS": AS,
      "CC": CC,
      "CHOST": CHOST,
      "CMAKE_CXX_COMPILER": CMAKE_CXX_COMPILER,
      "CMAKE_C_COMPILER": CMAKE_C_COMPILER,
      "CMAKE_TOOLCHAIN_FILE": "CMAKE_TOOLCHAIN_FILE",
      "CONAN_CMAKE_FIND_ROOT_PATH": CONAN_CMAKE_FIND_ROOT_PATH,
      "CONAN_CMAKE_SYSROOT": CONAN_CMAKE_SYSROOT,
      "CONAN_CMAKE_TOOLCHAIN_FILE": CONAN_CMAKE_TOOLCHAIN_FILE,
      "CXX": CXX,
      "LD": LD,
      "LD_LIBRARY_PATH": LD_LIBRARY_PATH,
      "NM": NM,
      "OBJCOPY": OBJCOPY,
      "OBJDUMP": OBJDUMP,
      "RANLIB": RANLIB,
      "STRIP": STRIP,
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
    if self.settings.arch == "wasm":
      for dep in NEXTCLADE_WASM_DEPS:
        self.requires(dep)
    else:
      for dep in NEXTCLADE_CLI_DEPS:
        self.requires(dep)

  def build(self):
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
    cmake.definitions["NEXTALIGN_BUILD_BENCHMARKS"] = config.NEXTALIGN_BUILD_BENCHMARKS
    cmake.definitions["NEXTALIGN_BUILD_CLI"] = config.NEXTALIGN_BUILD_CLI
    cmake.definitions["NEXTALIGN_BUILD_TESTS"] = config.NEXTALIGN_BUILD_TESTS
    cmake.definitions["NEXTALIGN_BUILD_TESTS"] = config.NEXTALIGN_BUILD_TESTS
    cmake.definitions["NEXTALIGN_MACOS_ARCH"] = config.HOST_ARCH
    cmake.definitions["NEXTALIGN_STATIC_BUILD"] = config.NEXTALIGN_STATIC_BUILD
    cmake.definitions["NEXTCLADE_BUILD_CLI"] = config.NEXTCLADE_BUILD_CLI
    cmake.definitions["NEXTCLADE_BUILD_TESTS"] = config.NEXTCLADE_BUILD_TESTS
    cmake.definitions["NEXTCLADE_BUILD_WASM"] = config.NEXTCLADE_BUILD_WASM
    cmake.definitions["NEXTCLADE_CLI_BUILD_TESTS"] = config.NEXTCLADE_CLI_BUILD_TESTS
    cmake.definitions["NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS"] = config.NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS
    cmake.definitions["NEXTCLADE_STATIC_BUILD"] = config.NEXTALIGN_STATIC_BUILD

    if self.should_configure:
      cmake.configure()

    if self.should_build:
      cmake.build(args=["-j 20"])
      self.postbuild(config)

  def postbuild(self, config):
    shell = Shell(config=config, cwd=PROJECT_ROOT_DIR)

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


def install_emscripten(config, shell, force=False):
  """
  Installs Emscripten if not already installed
  """
  if force or not os.path.isdir(config.NEXTCLADE_EMSDK_DIR):
    shell(f"./scripts/install_emscripten.sh '{config.NEXTCLADE_EMSDK_DIR}' '{config.NEXTCLADE_EMSDK_VERSION}'")


def create_conan_profile(config, shell):
  """
  Setup Conan C++ package manager profile in $CONAN_USER_HOME, if not already there.
  """
  if not os.path.exists(f"{config.CONAN_USER_HOME}/.conan/remotes.json"):
    run(f"CONAN_USER_HOME={config.CONAN_USER_HOME} CONAN_V2_MODE=1 conan profile new default --detect --force")
    run(f"CONAN_USER_HOME={config.CONAN_USER_HOME} CONAN_V2_MODE=1 conan config init")

    # Patch config file to add `libc` field. We use `musl` libc for static builds, so this config option is needed
    # to make sure dependencies are correctly rebuilt.
    if config.HOST_OS == "Linux":
      run(f"""printf '\\n\\nlibc: [None, \"glibc\", \"musl\"]\\n' >> '{config.CONAN_USER_HOME}/.conan/settings.yml'""")


def conan_create_custom_package(shell, config, package_path, package_ref):
  """
  Build a local Conan package from `package_path` directory and puts it into local Conan cache under name `package_ref`.
  The build is only done once, if the package is not yet in the cache. Later, when `conan install` step is running,
  this local package will be used, instead of querying remote repos, because the `package_ref` is used in the
  `requirements` field of `conanfile.py`.

  This is needed, because some packages needed to be patched in order to work in our particular setup (mostly because of
  whe static build).
  """
  search_result = run_and_get_stdout(f"CONAN_USER_HOME={config.CONAN_USER_HOME} conan search | grep {package_ref}",
                                     cwd=PROJECT_ROOT_DIR)

  if search_result == "":
    shell(f"""
      conan create . local/stable \
        -s build_type="{config.CONAN_BUILD_TYPE}" \
        {config.CONAN_ARCH_SETTINGS} \
        {config.CONAN_COMPILER_SETTINGS} \
        {config.CONAN_STATIC_BUILD_FLAGS} \
        {config.CONAN_TBB_STATIC_BUILD_FLAGS} \
        --build=missing \
    """, cwd=package_path)


def conan_create_custom_packages(config, shell):
  """
  Build custom versions of Conan packages from sources in `3rdparty` directory.
  These are the subset of dependencies that we had to modify for one reason or another. We have these mostly,
  to make sure they build and work correctly in static builds. Sometimes these modifications are just little
  adjustments to their build system, but sometimes also patches applied to the source code original tarballs or even
  entire modified source directories.

  Note that this only builds binary packages and populates the cache of the Conan package manager. The actual
  installation to the build directory happens during installation step, along with the other prebuilt packages from the
  remote Conan repositories.
  """

  if not config.NEXTCLADE_BUILD_WASM:
    # Order is important to ensure interdependencies are picked up correctly
    conan_create_custom_package(shell, config, "3rdparty/jemalloc", "jemalloc/5.2.1@local/stable")
    conan_create_custom_package(shell, config, "3rdparty/openssl", "openssl/1.1.1k@local/stable")
    conan_create_custom_package(shell, config, "3rdparty/c-ares", "c-ares/1.17.1@local/stable")
    conan_create_custom_package(shell, config, "3rdparty/zlib", "zlib/1.2.11@local/stable")
    conan_create_custom_package(shell, config, "3rdparty/libcurl", "libcurl/7.77.0@local/stable")
    conan_create_custom_package(shell, config, "3rdparty/poco", "poco/1.11.0@local/stable")
    conan_create_custom_package(shell, config, "3rdparty/tbb", "tbb/2021.3.0@local/stable")


def install_deps(config, shell):
  if config.NEXTCLADE_BUILD_WASM:
    install_emscripten(config, shell)

  create_conan_profile(config, shell)

  conan_create_custom_packages(config, shell)

  os.makedirs(config.BUILD_DIR, exist_ok=True)

  shell(f"""
    conan install "{config.CONANFILE}" \
      -s build_type="{config.CONAN_BUILD_TYPE}" \
      {config.CONAN_ARCH_SETTINGS} \
      {config.CONAN_COMPILER_SETTINGS} \
      {config.CONAN_STATIC_BUILD_FLAGS} \
      --build missing \
  """, cwd=config.BUILD_DIR)


def run_codegen_argparse(config, shell):
  """
  Generate C++ code for handling of command-line arguments.

  C++ arg parsing libraries are verbose, repetitive and tedious to use. So instead of writing it manually, we generate
  the code from a JSON definition file here. At some point, if we decide it's too complex or otherwise unsuitable, we
  could drop this step and commit the existing generated code to the source control.
  """
  shell(f"""
    python3 "{PROJECT_ROOT_DIR}/packages/nextclade_common/scripts/generate_cli.py" \
      --input_json={PROJECT_ROOT_DIR}/packages/nextclade_cli/cli.json \
      --output_cpp={PROJECT_ROOT_DIR}/packages/nextclade_cli/src/generated/cli.cpp \
      --output_h={PROJECT_ROOT_DIR}/packages/nextclade_cli/src/generated/cli.h \
  """, cwd=config.BUILD_DIR)

  # Let's format the generated code to make it more readable
  shell(f"""
    find "{PROJECT_ROOT_DIR}/packages/nextclade_cli/src/generated/" \
    -regex '.*\.\(c\|cpp\|h\|hpp\|cc\|cxx\)' \
    -exec clang-format -style=file -i {{}} \; \
  """, cwd=config.BUILD_DIR)


def run_codegen_cainfo(config, shell):
  """
  Generate C++ file with the inlined CA certificate from Curl.
  https://curl.se/docs/caextract.html

  This ensures that networking works regardless of whether CA certificates on a particular the Linux system are
  up-to-date. This is mostly relevant for older versions of   stable distros like Debian and CentOS.
  """
  shell(f"""
    python3 "{PROJECT_ROOT_DIR}/packages/nextclade_common/scripts/generate_cainfo_blob.py" \
        --input_pem={PROJECT_ROOT_DIR}/packages/nextclade_common/data/cacert.pem \
        --output_h={PROJECT_ROOT_DIR}/packages/nextclade_common/src/generated/cainfo.h \
  """, cwd=config.BUILD_DIR)


def run_codegen(config, shell):
  """
  Generates some of the project's autogenerated source code files
  """
  run_codegen_argparse(config, shell)
  run_codegen_cainfo(config, shell)


def configure_build(config, shell):
  """
  Configures the build system to prepare for running the build.
  This includes running Cmake and generating the actual build makefiles
  """
  shell(f"""
    conan build --configure {PROJECT_ROOT_DIR} \
      --source-folder={PROJECT_ROOT_DIR} \
      --build-folder={config.BUILD_DIR} \
  """, cwd=config.BUILD_DIR)


def run_build(config, shell):
  """
  Runs the build. Compiles and links the binaries.
  In release mode it also installs the binaries into the install dir.
  """
  shell(f"""
    conan build --build {PROJECT_ROOT_DIR} \
      --source-folder={PROJECT_ROOT_DIR} \
      --build-folder={config.BUILD_DIR} \
  """, cwd=config.BUILD_DIR)


if __name__ == '__main__':
  config, shell = configure()

  install_deps(config, shell)
  run_codegen(config, shell)
  configure_build(config, shell)
  run_build(config, shell)
