import os

from run_command import run_and_get_stdout, run


def install_emscripten(config, shell, force=False):
  """
  Installs Emscripten, if not already installed. Emscripten is a C++ toolchain, which allows producing WebAssembly
  modules. See: https://emscripten.org/
  """
  if force or not os.path.isdir(config.NEXTCLADE_EMSDK_DIR):
    shell(f"./scripts/install_emscripten.sh '{config.NEXTCLADE_EMSDK_DIR}' '{config.NEXTCLADE_EMSDK_VERSION}'")


def create_conan_profile(config, shell):
  """
  Setup Conan C++ package manager profile in $CONAN_USER_HOME, if not already there.
  See: https://conan.io/
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
                                     cwd=config.PROJECT_ROOT_DIR)

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
  """
  Installs dependencies
  """

  # Install Emscripten toolchain for WebAssembly builds
  if config.NEXTCLADE_BUILD_WASM:
    install_emscripten(config, shell)

  # Configure Conan C++ package manager
  create_conan_profile(config, shell)

  # Build customized 3rdparty dependencies and create local Conan packages
  conan_create_custom_packages(config, shell)

  # Install Conan packages into build directory, so that they can be picked up by Cmake later on
  shell(f"""
    conan install \
      -s build_type="{config.CONAN_BUILD_TYPE}" \
      {config.CONAN_ARCH_SETTINGS} \
      {config.CONAN_COMPILER_SETTINGS} \
      {config.CONAN_STATIC_BUILD_FLAGS} \
      --build missing \
      {config.CONANFILE} \
  """, cwd=config.BUILD_DIR)
