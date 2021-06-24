cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
include(CFlags)
include(Sanitizers)

project(nextclade DESCRIPTION "C++ library for viral genome analysis")

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

find_package(Boost 1.75.0 COMPONENTS headers REQUIRED)
find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(fast-cpp-csv-parser 20191004 REQUIRED)
find_package(fmt 7.1.0 REQUIRED)
find_package(semver 0.3.0 REQUIRED)

set(SOURCE_FILES
  include/nextclade/nextclade.h
  include/nextclade/private/__generated__/types.h
  include/nextclade/private/nextclade_private.h
  src/analyze/aminoacid.cpp
  src/analyze/aminoacid.h
  src/analyze/calculateTotalLength.h
  src/analyze/findNucChanges.cpp
  src/analyze/findNucChanges.h
  src/analyze/findNucleotideRanges.cpp
  src/analyze/findNucleotideRanges.h
  src/analyze/getAminoacidChanges.cpp
  src/analyze/getAminoacidChanges.h
  src/analyze/getNucleotideComposition.cpp
  src/analyze/getNucleotideComposition.h
  src/analyze/getPcrPrimerChanges.cpp
  src/analyze/getPcrPrimerChanges.h
  src/analyze/isMatch.cpp
  src/analyze/isMatch.h
  src/analyze/isSequenced.cpp
  src/analyze/isSequenced.h
  src/analyze/linkNucAndAaChangesInPlace.cpp
  src/analyze/linkNucAndAaChangesInPlace.h
  src/analyze/nucleotide.cpp
  src/analyze/nucleotide.h
  src/io/CsvWriter.cpp
  src/io/convertPcrPrimers.cpp
  src/io/convertPcrPrimers.h
  src/io/formatMutation.cpp
  src/io/formatMutation.h
  src/io/formatQcStatus.cpp
  src/io/formatQcStatus.h
  src/io/jsonStringify.cpp
  src/io/jsonStringify.h
  src/io/parseAnalysisResults.cpp
  src/io/parseAnalysisResults.h
  src/io/parseCsv.h
  src/io/parseGeneMap.cpp
  src/io/parseMutation.cpp
  src/io/parseMutation.h
  src/io/parseQcConfig.cpp
  src/io/parseQcConfig.h
  src/io/serializeGeneMap.cpp
  src/io/serializeQcConfig.cpp
  src/io/serializeQcConfig.h
  src/io/serializeResults.cpp
  src/io/serializeResults.h
  src/nextclade.cpp
  src/qc/getQcRuleStatus.cpp
  src/qc/getQcRuleStatus.h
  src/qc/isQcConfigVersionRecent.cpp
  src/qc/isQcConfigVersionRecent.h
  src/qc/ruleFrameShifts.cpp
  src/qc/ruleFrameShifts.h
  src/qc/ruleMissingData.cpp
  src/qc/ruleMissingData.h
  src/qc/ruleMixedSites.cpp
  src/qc/ruleMixedSites.h
  src/qc/rulePrivateMutations.cpp
  src/qc/rulePrivateMutations.h
  src/qc/ruleSnpClusters.cpp
  src/qc/ruleSnpClusters.h
  src/qc/ruleStopCodons.cpp
  src/qc/ruleStopCodons.h
  src/qc/runQc.cpp
  src/qc/runQc.h
  src/tree/Tree.cpp
  src/tree/Tree.h
  src/tree/TreeNode.cpp
  src/tree/TreeNode.h
  src/tree/treeAttachNodes.cpp
  src/tree/treeAttachNodes.h
  src/tree/treeFindNearestNodes.cpp
  src/tree/treeFindNearestNodes.h
  src/tree/treePostprocess.cpp
  src/tree/treePostprocess.h
  src/tree/treePreprocess.cpp
  src/tree/treePreprocess.h
  src/utils/concat.h
  src/utils/concat_move.h
  src/utils/config.h
  src/utils/contains.h
  src/utils/contract.h
  src/utils/debugbreak.h
  src/utils/eraseDuplicates.h
  src/utils/ieee754_comparison.h
  src/utils/macro_overload.h
  src/utils/map.h
  src/utils/mapFind.h
  src/utils/range.h
  src/utils/safe_cast.h
  )

add_library(${PROJECT_NAME} STATIC ${SOURCE_FILES})

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
  set_target_properties(${PROJECT_NAME} PROPERTIES COMPILE_FLAGS ${NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS})
  set_target_properties(${PROJECT_NAME} PROPERTIES LINK_FLAGS ${NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS})
endif ()

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

  -DRAPIDJSON_SSE42=1
  -DRAPIDJSON_HAS_STDSTRING=1
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
  "${CMAKE_SOURCE_DIR}/3rdparty/json/include"
  )

target_include_directories(${PROJECT_NAME}
  PUBLIC
  include
  )

target_link_libraries(${PROJECT_NAME}
  PUBLIC
  nextalign

  PRIVATE
  Boost::headers
  Microsoft.GSL::GSL
  fast-cpp-csv-parser::fast-cpp-csv-parser
  fmt::fmt-header-only
  semver::semver
  )

set(NEXTCLADE_BUILD_TESTS ON CACHE BOOL "Build unit tests")
if (${NEXTCLADE_BUILD_TESTS})
  enable_testing()
  add_subdirectory(src/__tests__)
endif ()
