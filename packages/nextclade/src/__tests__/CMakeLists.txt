cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

project(nextclade_tests)

find_package(Boost 1.75.0 COMPONENTS headers REQUIRED)
find_package(GTest 1.10.0 REQUIRED)
find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(fmt 7.1.0 REQUIRED)

add_executable(${PROJECT_NAME}
  findNucChanges.test.cpp
  findNucleotideRanges.test.cpp
  findPrivateMutations.test.cpp
  getAminoacidChanges.test.cpp
  getNucleotideComposition.test.cpp
  getPcrPrimerChanges.test.cpp
  isMatch.test.cpp
  isSequenced.test.cpp
  operatorLess.cpp
  parseMutation.test.cpp
  range.test.cpp
  tree.test.cpp
  )

set_property(TARGET ${PROJECT_NAME} PROPERTY C_STANDARD 11)
set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 17)

if (CMAKE_CXX_COMPILER_ID MATCHES "GNU" OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  target_compile_options(${PROJECT_NAME} PRIVATE
    -Wno-missing-field-initializers
    )
endif ()

target_compile_definitions(${PROJECT_NAME}
  PUBLIC -DAPP_NAME="${PROJECT_NAME}"

  -DFMT_HEADER_ONLY=1
  )

target_include_directories(${PROJECT_NAME} SYSTEM
  PRIVATE
  "${CMAKE_SOURCE_DIR}/3rdparty/json/include"
  )

target_include_directories(${PROJECT_NAME}
  PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/
  )

target_link_libraries(${PROJECT_NAME}
  PRIVATE
  nextclade
  Boost::headers
  GTest::GTest
  Microsoft.GSL::GSL
  fmt::fmt-header-only
  )

add_test(${PROJECT_NAME} ${PROJECT_NAME})
