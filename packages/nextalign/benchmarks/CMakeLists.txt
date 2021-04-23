cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

project(nextalign_benchmarks)

find_package(Boost 1.75.0 COMPONENTS headers REQUIRED)
find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(benchmark REQUIRED)
find_package(fmt 7.1.0 REQUIRED)

add_executable(${PROJECT_NAME}
  src/AlignPairwise.benchmark.h
  src/BackwardTrace.benchmark.h
  src/ForwardTrace.benchmark.h
  src/Nextalign.benchmark.h
  src/SeedMatching.benchmark.h
  src/StripInsertions.benchmark.h
  src/main.cpp
  src/utils/getData.h
  src/utils/setCounters.h
  )

set_property(TARGET ${PROJECT_NAME} PROPERTY C_STANDARD 11)
set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 17)

target_compile_definitions(${PROJECT_NAME}
  PRIVATE
  -DFMT_HEADER_ONLY=1
  )

target_include_directories(${PROJECT_NAME} SYSTEM
  PRIVATE
  "${CMAKE_SOURCE_DIR}/3rdparty/boost/include"
  )

target_link_libraries(${PROJECT_NAME}
  PRIVATE
  nextalign
  Boost::headers
  Microsoft.GSL::GSL
  benchmark::benchmark
  fmt::fmt-header-only
  )
