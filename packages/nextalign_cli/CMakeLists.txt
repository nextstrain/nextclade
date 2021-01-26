cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
include(CFlags)
include(Quiet)
include(Sanitizers)

project(nextalign_cli VERSION 0.1.0
  DESCRIPTION "Viral genome reference alignment"
  )

set(CMAKE_INCLUDE_CURRENT_DIR ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

find_package(boost_algorithm 1.68.0 REQUIRED)
find_package(boost_base 1.68.0 REQUIRED)
find_package(boost_detail 1.68.0 REQUIRED)
find_package(cxxopts 2.2.1 REQUIRED)
find_package(fmt 7.1.0 REQUIRED)
find_package(TBB REQUIRED)

if (${NEXTALIGN_STATIC_BUILD})
  set(STATIC_BUILD_FLAGS "-static -static-libstdc++ -static-libgcc")
endif ()

add_executable(${PROJECT_NAME}
  src/cli.cpp
  )

set_property(TARGET ${PROJECT_NAME} PROPERTY
  OUTPUT_NAME nextalign-${CMAKE_SYSTEM_NAME}-${CMAKE_SYSTEM_PROCESSOR})

set_property(TARGET ${PROJECT_NAME} PROPERTY C_STANDARD 11)
set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 17)

target_compile_definitions(${PROJECT_NAME}
  PRIVATE
  -DPROJECT_NAME="${PROJECT_NAME}"
  -DPROJECT_VERSION="${PROJECT_VERSION}"
  -DPROJECT_DESCRIPTION="${PROJECT_DESCRIPTION}"
  -DPROJECT_VERSION_MAJOR="${PROJECT_VERSION_MAJOR}"
  -DPROJECT_VERSION_MINOR="${PROJECT_VERSION_MINOR}"
  -DPROJECT_VERSION_PATCH="${PROJECT_VERSION_PATCH}"
  )

target_include_directories(${PROJECT_NAME}
  PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/src"
  )

target_link_libraries(${PROJECT_NAME}
  PRIVATE
  boost_algorithm::boost_algorithm
  boost_base::boost_base
  boost_detail::boost_detail
  cxxopts::cxxopts
  fmt::fmt
  nextalign
  TBB::tbb
  ${STATIC_BUILD_FLAGS}
  )

install(
  TARGETS ${PROJECT_NAME}
  CONFIGURATIONS Release
  RUNTIME DESTINATION bin
)
