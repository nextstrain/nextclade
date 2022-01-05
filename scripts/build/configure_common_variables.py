import os

from configure_linux_static_toolchain import configure_linux_static_toolchain
from configure_wasm_toolchain import configure_wasm_toolchain
from get_machine_info import get_machine_info
from is_ci import check_is_ci
from is_truthy import is_truthy
from namedtuple import dict_to_namedtuple
from run_command import join_path_var, Shell


def configure_common_variables(project_root_dir, args=None):
  """
  Prepares variables used in subsequent build steps,
  based on shell environment variables and command line arguments. Creates a
  'Shell' object that is used to run external shell commands. This shell uses
  environment preconfigured with these variables.
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
  if CMAKE_BUILD_TYPE in ["Debug", "Release", "RelWithDebInfo", "MinSizeRelease"]:
    CONAN_BUILD_TYPE = CMAKE_BUILD_TYPE
  elif CMAKE_BUILD_TYPE in ["ASAN", "MSAN", "TSAN", "UBSAN"]:
    CONAN_BUILD_TYPE = "RelWithDebInfo"
  else:
    CONAN_BUILD_TYPE = "Release"

  PATH.extend([
    f"{project_root_dir}/3rdparty/binutils/bin",
    f"{project_root_dir}/3rdparty/gcc/bin",
    f"{project_root_dir}/3rdparty/llvm/bin",
  ])

  # Clang
  USE_CLANG = is_truthy(os.environ.get('USE_CLANG'))
  USE_LIBCPP = is_truthy(os.environ.get('USE_LIBCPP'))

  # Clang Analyzer
  USE_CLANG_ANALYZER = is_truthy(os.environ.get('USE_CLANG_ANALYZER'))
  CLANG_ANALYZER = ""
  if USE_CLANG_ANALYZER:
    USE_CLANG = True
    CLANG_ANALYZER = f"scan-build -v --keep-going -o {project_root_dir}/.reports/clang-analyzer"
    os.makedirs(f"{project_root_dir}/.reports/clang-analyzer", exist_ok=True)

  INSTALL_DIR = f"{project_root_dir}/.out"

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

  if HOST_OS == "MacOS":
    # Avoid compiler error:
    # error: aligned deallocation function of type 'void (void *, std::size_t, std::align_val_t) noexcept' is only available on macOS 10.14 or newer
    # note: if you supply your own aligned allocation functions, use -faligned-allocation to silence this diagnostic
    CMAKE_CXX_FLAGS = f"{CMAKE_CXX_FLAGS} -faligned-allocation"

  if HOST_OS == "MacOS":
    PATH.append("/local/opt/m4/bin")

  # Gather preliminary variables. These will be used to setup toolchains.
  config_dict = {
    "PROJECT_ROOT_DIR": project_root_dir,
    "BUILD_PREFIX": BUILD_PREFIX,
    "BUILD_SUFFIX": BUILD_SUFFIX,
    "INSTALL_DIR": INSTALL_DIR,

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

    "CONAN_ARCH_SETTINGS": CONAN_ARCH_SETTINGS,
    "CONAN_COMPILER_SETTINGS": CONAN_COMPILER_SETTINGS,
    "CONAN_STATIC_BUILD_FLAGS": CONAN_STATIC_BUILD_FLAGS,
    "CONAN_TBB_STATIC_BUILD_FLAGS": CONAN_TBB_STATIC_BUILD_FLAGS,

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

  config = dict_to_namedtuple("BuildConfig", config_dict)

  # Setup toolchains
  toolchain_config_dict = {}
  if NEXTCLADE_BUILD_WASM:
    toolchain_config_dict = configure_wasm_toolchain(config)
  elif NEXTALIGN_STATIC_BUILD and HOST_OS == "Linux":
    toolchain_config_dict = configure_linux_static_toolchain(config)

  config_dict.update(**toolchain_config_dict)

  BUILD_DIR_NAME = f"{config_dict['BUILD_PREFIX']}{config_dict['CMAKE_BUILD_TYPE']}{config_dict['BUILD_SUFFIX']}"

  # Update the config with the new values
  config_dict.update(**toolchain_config_dict)
  config_dict.update({
    "PATH": join_path_var(config_dict["PATH"]),
    "LD_LIBRARY_PATH": join_path_var(config_dict["LD_LIBRARY_PATH"]),
    "CONAN_USER_HOME": f"{project_root_dir}/.cache/{BUILD_DIR_NAME}",
    "CCACHE_DIR": f"{project_root_dir}/.cache/{BUILD_DIR_NAME}/.ccache",
    "BUILD_DIR": f"{project_root_dir}/.build/{BUILD_DIR_NAME}",
  })

  config_dict = dict(filter(lambda item: item[1] is not None, config_dict.items()))
  config = dict_to_namedtuple("BuildConfig", config_dict)

  shell = Shell(config=config, cwd=project_root_dir)
  return config, shell
