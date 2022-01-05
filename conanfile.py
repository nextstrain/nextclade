"""
Implements build system for C++ parts of the project.

This blends together a configuration file for Conan C++ package manager (usually 'conanfile.py') and
a custom python build logic.

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
from configure_common_variables import configure_common_variables
from install_deps import install_deps
from parse_args import parse_args, COMMANDS
from run import run

# Combine system environment variables with variables read from .env files
os.environ = {
  **os.environ,
  **dotenv_values(".env.example"),
  **dotenv_values(".env"),
}

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
  See: https://docs.conan.io/en/latest/reference/conanfile.html
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

    config, shell = configure_common_variables(project_root_dir=PROJECT_ROOT_DIR, args=None)

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

  if len(args["commands"]) == 0:
    args["commands"] = COMMANDS

  config, shell = configure_common_variables(project_root_dir=PROJECT_ROOT_DIR, args=args)

  os.makedirs(config.BUILD_DIR, exist_ok=True)

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

  if 'run' in args["commands"]:
    run(config, shell)
