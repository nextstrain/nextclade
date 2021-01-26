cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
include(packages/cmake/CCache.cmake)
include(packages/cmake/CFlags.cmake)
include(packages/cmake/Quiet.cmake)
include(packages/cmake/Sanitizers.cmake)

project(nextalign_all)

set(CMAKE_INCLUDE_CURRENT_DIR ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

set(CMAKE_CXX_FLAGS_RELWITHDEBINFO "-g -pg")

add_subdirectory(packages/nextalign)
add_subdirectory(packages/nextalign_cli)
