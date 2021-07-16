set(CMAKE_CROSSCOMPILING TRUE)
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR x86_64)
set(WIN32)
set(APPLE)
set(UNIX 1)
set(MUSL 1)
set(TARGET_TRIPLET "x86_64-linux-musl")

set_property(GLOBAL PROPERTY TARGET_SUPPORTS_SHARED_LIBS FALSE)

set(CMAKE_SHARED_LIBRARY_SONAME_C_FLAG "-Wl,-soname,")
set(CMAKE_SHARED_LIBRARY_SONAME_CXX_FLAG "-Wl,-soname,")

# Do a no-op access on the CMAKE_TOOLCHAIN_FILE variable so that CMake will not
# issue a warning on it being unused.
if (CMAKE_TOOLCHAIN_FILE)
endif()

# Locate where the compiler resides relative to this toolchain file
if ("${TOOLCHAIN_ROOT_PATH}" STREQUAL "")
  get_filename_component(GUESS_TOOLCHAIN_ROOT_PATH "${CMAKE_CURRENT_LIST_DIR}/../../.cache/gcc" ABSOLUTE)
  set(GCC_EXE_PATH "${GUESS_TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-gcc")
  if (EXISTS "${GCC_EXE_PATH}")
    set(TOOLCHAIN_ROOT_PATH "${GUESS_TOOLCHAIN_ROOT_PATH}")
  endif()
endif()

# If not found by above search, locate using the EMSCRIPTEN environment variable.
if ("${TOOLCHAIN_ROOT_PATH}" STREQUAL "")
  set(TOOLCHAIN_ROOT_PATH "$ENV{EMSCRIPTEN}")
endif()

# Abort if not found.
if ("${TOOLCHAIN_ROOT_PATH}" STREQUAL "")
  message(FATAL_ERROR "Could not locate compiler toolchain directory! Pass -DTOOLCHAIN_ROOT_PATH=xxx to CMake to explicitly specify the location of the compiler!")
endif()

# Normalize, convert Windows backslashes to forward slashes or CMake will crash.
get_filename_component(TOOLCHAIN_ROOT_PATH "${TOOLCHAIN_ROOT_PATH}" ABSOLUTE)

list(APPEND CMAKE_FIND_ROOT_PATH "${TOOLCHAIN_ROOT_PATH}")

set(CMAKE_CHOST                      "${TARGET_TRIPLET}"                                       )
set(CMAKE_C_COMPILER_TARGET          "${TARGET_TRIPLET}"                                       )
set(CMAKE_CXX_COMPILER_TARGET        "${TARGET_TRIPLET}"                                       )

set(CMAKE_CC                         "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-gcc"        )
set(CMAKE_CXX                        "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-g++"        )
set(CMAKE_AS                         "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-as"         )
set(CMAKE_AR                         "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-gcc-ar"     )
set(CMAKE_RANLIB                     "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-gcc-ranlib" )
set(CMAKE_STRIP                      "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-strip"      )
set(CMAKE_LD                         "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-ld"         )
set(CMAKE_NM                         "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-nm"         )
set(CMAKE_OBJCOPY                    "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-objcopy"    )
set(CMAKE_OBJDUMP                    "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-objdump"    )
set(CMAKE_STRIP                      "${TOOLCHAIN_ROOT_PATH}/bin/${TARGET_TRIPLET}-strip"      )

set(CMAKE_C_COMPILER                 "${CMAKE_CC}"                                             )
set(CMAKE_CXX_COMPILER               "${CMAKE_CXX}"                                            )
set(CMAKE_C_COMPILER_AR              "${CMAKE_AR}"                                             )
set(CMAKE_CXX_COMPILER_AR            "${CMAKE_AR}"                                             )
set(CMAKE_C_COMPILER_RANLIB          "${CMAKE_RANLIB}"                                         )
set(CMAKE_CXX_COMPILER_RANLIB        "${CMAKE_RANLIB}"                                         )


set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)

# Don't look at the system include and lib directories
if (NOT CMAKE_FIND_ROOT_PATH_MODE_LIBRARY)
  set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
endif()
if (NOT CMAKE_FIND_ROOT_PATH_MODE_INCLUDE)
  set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
endif()
if (NOT CMAKE_FIND_ROOT_PATH_MODE_PACKAGE)
  set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
endif()

set(CMAKE_SYSTEM_INCLUDE_PATH "${TOOLCHAIN_ROOT_PATH}/include")
