cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
include(CFlags)
include(Quiet)
include(Sanitizers)

project(nextalign VERSION 0.1.1
  DESCRIPTION "C++ library for viral genome reference alignment"
  )

set(CMAKE_INCLUDE_CURRENT_DIR ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(boost_algorithm 1.68.0 REQUIRED)
find_package(boost_base 1.68.0 REQUIRED)
find_package(boost_detail 1.68.0 REQUIRED)
find_package(fast-cpp-csv-parser 20191004 REQUIRED)
find_package(fmt 7.1.0 REQUIRED)
find_package(type_safe 0.2.1 REQUIRED)

add_library(${PROJECT_NAME} STATIC
  include/nextalign/nextalign.h
  src/align/alignPairwise.cpp
  src/align/alignPairwise.h
  src/align/getGapOpenCloseScores.cpp
  src/align/getGapOpenCloseScores.h
  src/alphabet/aminoacids.cpp
  src/alphabet/aminoacids.h
  src/alphabet/nucleotides.cpp
  src/alphabet/nucleotides.h
  src/io/gene.io.cpp
  src/io/gene.io.h
  src/io/parseGeneMapGff.cpp
  src/io/parseSequences.cpp
  src/match/matchAa.cpp
  src/match/matchAa.h
  src/match/matchNuc.cpp
  src/match/matchNuc.h
  src/nextalign.cpp
  src/nextalign_private.h
  src/strip/stripInsertions.h
  src/translate/decode.cpp
  src/translate/decode.h
  src/translate/extractGene.cpp
  src/translate/extractGene.h
  src/translate/mapCoordinates.cpp
  src/translate/mapCoordinates.h
  src/translate/removeGaps.h
  src/translate/translate.cpp
  src/translate/translate.h
  src/translate/translateGenes.cpp
  src/translate/translateGenes.h
  src/utils/concat_move.h
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
  -DPROJECT_VERSION="${PROJECT_VERSION}"
  -DPROJECT_VERSION_MAJOR="${PROJECT_VERSION_MAJOR}"
  -DPROJECT_VERSION_MINOR="${PROJECT_VERSION_MINOR}"
  -DPROJECT_VERSION_PATCH="${PROJECT_VERSION_PATCH}"

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
  boost_algorithm::boost_algorithm
  boost_base::boost_base
  boost_detail::boost_detail
  fast-cpp-csv-parser::fast-cpp-csv-parser
  fmt::fmt
  type_safe::type_safe
  )

set(NEXTALIGN_BUILD_TESTS ON CACHE BOOL "Build unit tests")
if (${NEXTALIGN_BUILD_TESTS})
  include(CTest)
  enable_testing()
  add_subdirectory(tests)
endif ()

set(NEXTALIGN_BUILD_BENCHMARKS OFF CACHE BOOL "Build benchmarks")
if (${NEXTALIGN_BUILD_BENCHMARKS})
  add_subdirectory(benchmarks)
endif ()
