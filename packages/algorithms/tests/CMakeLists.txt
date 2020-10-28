cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

project(nextclade_tests)

find_package(GTest 1.10.0 REQUIRED)

add_executable(${PROJECT_NAME}
  analyzeSequence.test.cpp
  isCanonicalNucleotide.test.cpp
  parseSequences.test.cpp
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
  nextclade
  GTest::GTest
  )

add_test(${PROJECT_NAME} ${PROJECT_NAME})
