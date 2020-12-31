cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
include(CFlags)
include(Quiet)
include(Sanitizers)

project(nextclade)

set(CMAKE_INCLUDE_CURRENT_DIR ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(boost_base 1.68.0 REQUIRED)
find_package(fast-cpp-csv-parser 20191004 REQUIRED)
find_package(fmt 7.1.0 REQUIRED)
find_package(type_safe 0.2.1 REQUIRED)

add_library(${PROJECT_NAME} STATIC
  include/nextclade/nextclade.h
  src/nextclade.cpp
  src/nextclade_private.h
  src/utils/config.h
  src/utils/contains.h
  src/utils/contract.h
  src/utils/debugbreak.h
  src/utils/ieee754_comparison.h
  src/utils/macro_overload.h
  src/utils/map.h
  src/utils/safe_cast.h
  src/utils/to_underlying.h
  src/utils/vector2d.h
  )

set_property(TARGET ${PROJECT_NAME} PROPERTY C_STANDARD 11)
set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 17)

target_compile_definitions(${PROJECT_NAME}
  PRIVATE

  -DPROJECT_NAME="${PROJECT_NAME}"

  # Workaround for GCC 9 error in type_safe.
  # See: https://github.com/foonathan/debug_assert/issues/17
  -DDEBUG_ASSERT_PURE_FUNCTION=
  )

target_include_directories(${PROJECT_NAME}
  PRIVATE
  "${CMAKE_CURRENT_SOURCE_DIR}/src"

  PUBLIC
  "${CMAKE_CURRENT_SOURCE_DIR}/include"
  )

target_include_directories(${PROJECT_NAME} SYSTEM
  PRIVATE
  "${CMAKE_SOURCE_DIR}/3rdparty/frozen/include"
  )

target_link_libraries(${PROJECT_NAME}
  PUBLIC

  PRIVATE
  Microsoft.GSL::GSL
  boost_base::boost_base
  fast-cpp-csv-parser::fast-cpp-csv-parser
  fmt::fmt
  type_safe::type_safe
  )

#set(NEXTCLADE_BUILD_TESTS ON CACHE BOOL "Build unit tests")
#if (${NEXTCLADE_BUILD_TESTS})
#  include(CTest)
#  enable_testing()
#  add_subdirectory(tests)
#endif ()
#
#set(NEXTCLADE_BUILD_BENCHMARKS OFF CACHE BOOL "Build benchmarks")
#if (${NEXTCLADE_BUILD_BENCHMARKS})
#  add_subdirectory(benchmarks)
#endif ()
