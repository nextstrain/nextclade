import os

from run_command import run


def configure_linux_static_toolchain(config):
  """
  Adjusts variables for static build on Linux.
  This will setup the custom GCC toolchain based on alternative C library called 'libmusl'
  (as opposed to GNU libc which is the default on our build machines).
  This ensures fully static builds portable across various Linux distributions.
  """
  TARGET_TRIPLET = "x86_64-linux-musl"
  TOOLCHAIN_ROOT_DIR = f"{config.PROJECT_ROOT_DIR}/.cache/gcc"
  CONAN_CMAKE_SYSROOT = TOOLCHAIN_ROOT_DIR
  CONAN_CMAKE_FIND_ROOT_PATH = TOOLCHAIN_ROOT_DIR

  config.PATH.extend([f"{TOOLCHAIN_ROOT_DIR}/bin"])
  config.LD_LIBRARY_PATH.extend([f"{TOOLCHAIN_ROOT_DIR}/x86_64-linux-musl/lib"])

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

  CMAKE_TOOLCHAIN_FILE = f"{config.PROJECT_ROOT_DIR}/config/cmake/musl.toolchain.cmake"
  CONAN_CMAKE_TOOLCHAIN_FILE = CMAKE_TOOLCHAIN_FILE

  CONAN_STATIC_BUILD_FLAGS = f"\
      {config.CONAN_STATIC_BUILD_FLAGS} \
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

  BUILD_SUFFIX = f"{config.BUILD_SUFFIX}-Static"

  # noinspection PyProtectedMember
  config_dict = config._asdict()

  return {
    **config_dict,

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
    "CMAKE_C_FLAGS": CMAKE_C_FLAGS,
    "CMAKE_CXX_FLAGS": CMAKE_CXX_FLAGS,

    "CMAKE_TOOLCHAIN_FILE": CMAKE_TOOLCHAIN_FILE,
    "CONAN_CMAKE_TOOLCHAIN_FILE": CONAN_CMAKE_TOOLCHAIN_FILE,

    "CONAN_CMAKE_SYSROOT": CONAN_CMAKE_SYSROOT,
    "CONAN_CMAKE_FIND_ROOT_PATH": CONAN_CMAKE_FIND_ROOT_PATH,

    "CONAN_STATIC_BUILD_FLAGS": CONAN_STATIC_BUILD_FLAGS,
    "CONAN_TBB_STATIC_BUILD_FLAGS": CONAN_TBB_STATIC_BUILD_FLAGS,

    "BUILD_SUFFIX": BUILD_SUFFIX,
  }
