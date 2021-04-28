cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
include(CFlags)
include(Quiet)
include(Sanitizers)

project(nextalign DESCRIPTION "C++ library for viral genome reference alignment")

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(Boost 1.75.0 COMPONENTS headers REQUIRED)
find_package(fast-cpp-csv-parser 20191004 REQUIRED)
find_package(fmt 7.1.0 REQUIRED)
find_package(type_safe 0.2.1 REQUIRED)

add_library(${PROJECT_NAME} STATIC
  include/nextalign/nextalign.h
  include/nextalign/private/nextalign_private.h
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
  src/options/options.cpp
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
  -DPROJECT_VERSION="${NEXTCLADE_CPP_VERSION}"

  -DFMT_HEADER_ONLY=1

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
  "${CMAKE_SOURCE_DIR}/3rdparty/boost/include"
  )

target_include_directories(${PROJECT_NAME}
  PUBLIC
  include
  )

target_link_libraries(${PROJECT_NAME}
  PRIVATE
  Microsoft.GSL::GSL
  Boost::headers
  fast-cpp-csv-parser::fast-cpp-csv-parser
  fmt::fmt-header-only
  type_safe::type_safe
  )

set(NEXTALIGN_BUILD_TESTS ON CACHE BOOL "Build unit tests")
if (${NEXTALIGN_BUILD_TESTS})
  enable_testing()
  add_subdirectory(tests)
endif ()

set(NEXTALIGN_BUILD_BENCHMARKS OFF CACHE BOOL "Build benchmarks")
if (${NEXTALIGN_BUILD_BENCHMARKS})
  add_subdirectory(benchmarks)
endif ()
