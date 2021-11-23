cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
include(packages/cmake/CCache.cmake)
include(packages/cmake/CFlags.cmake)
include(packages/cmake/Quiet.cmake)
include(packages/cmake/Sanitizers.cmake)

file(STRINGS "VERSION" NEXTCLADE_CPP_VERSION)

project(nextclade_all)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

set(CMAKE_CXX_FLAGS_RELWITHDEBINFO "-g -pg")

add_subdirectory(packages/nextalign)
add_subdirectory(packages/nextclade)


option(NEXTALIGN_BUILD_CLI "Build Nextalign CLI executable" OFF)
option(ENABLE_DEBUG_TRACE "Enable debug_trace() macro in the codebase" OFF)

set(NEXTALIGN_BUILD_CLI ${NEXTCLADE_BUILD_CLI} CACHE BOOL "Build Nextalign CLI executable")
if (${NEXTALIGN_BUILD_CLI})
  add_subdirectory(packages/nextalign_cli)
  set(NEEDS_NEXTCLADE_COMMON 1)
  set(NEEDS_NEXTCLADE_JSON 1)
endif ()

option(NEXTCLADE_BUILD_CLI "Build Nextclade CLI executable" OFF)
if (${NEXTCLADE_BUILD_CLI})
  add_subdirectory(packages/nextclade_cli)
  set(NEEDS_NEXTCLADE_COMMON 1)
  set(NEEDS_NEXTCLADE_JSON 1)
endif ()

if (${NEEDS_NEXTCLADE_COMMON})
  add_subdirectory(packages/nextclade_common)
endif ()

option(NEXTCLADE_BUILD_WASM "Build Nextclade WebAssembly module" OFF)
if (${NEXTCLADE_BUILD_WASM})
  add_subdirectory(packages/nextclade_wasm)
  set(NEEDS_NEXTCLADE_JSON 1)
endif ()

if (${NEEDS_NEXTCLADE_JSON})
  add_subdirectory(packages/nextclade_json)
endif ()
