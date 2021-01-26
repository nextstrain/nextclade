cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

project(nextalign_benchmarks)

find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(benchmark REQUIRED)
find_package(boost_algorithm 1.68.0 REQUIRED)
find_package(boost_base 1.68.0 REQUIRED)
find_package(boost_detail 1.68.0 REQUIRED)
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

target_link_libraries(${PROJECT_NAME}
  PRIVATE
  nextalign
  benchmark::benchmark
  boost_algorithm::boost_algorithm
  boost_base::boost_base
  boost_detail::boost_detail
  fmt::fmt
  Microsoft.GSL::GSL
  )
