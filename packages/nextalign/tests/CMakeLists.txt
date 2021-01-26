cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

project(nextalign_tests)

find_package(GTest 1.10.0 REQUIRED)
find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(boost_algorithm 1.68.0 REQUIRED)
find_package(boost_base 1.68.0 REQUIRED)
find_package(boost_detail 1.68.0 REQUIRED)
find_package(fmt 7.1.0 REQUIRED)

add_executable(${PROJECT_NAME}
  alignPairwise.test.cpp
  alignPairwiseWithCodons.test.cpp
  data/sampleGeneMap.h
  decode.test.cpp
  extractGene.test.cpp
  mapCoordinates.test.cpp
  parseGeneMapGff.test.cpp
  parseSequences.test.cpp
  removeGaps.test.cpp
  stripInsertions.test.cpp
  translate.test.cpp
  )

set_property(TARGET ${PROJECT_NAME} PROPERTY C_STANDARD 11)
set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 17)

target_compile_definitions(${PROJECT_NAME}
  PUBLIC -DAPP_NAME="${PROJECT_NAME}"
  )

target_include_directories(${PROJECT_NAME}
  PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/
  )

target_link_libraries(${PROJECT_NAME}
  PRIVATE
  nextalign
  GTest::GTest
  Microsoft.GSL::GSL
  boost_algorithm::boost_algorithm
  boost_base::boost_base
  boost_detail::boost_detail
  fmt::fmt
  )

add_test(${PROJECT_NAME} ${PROJECT_NAME})
