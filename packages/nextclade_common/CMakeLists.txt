cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
include(CFlags)
include(Quiet)
include(Sanitizers)

project(nextclade_common DESCRIPTION "C++ library with code shared across multiple Nextclade modules")

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

find_package(Boost 1.75.0 COMPONENTS headers REQUIRED)
find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(TBB REQUIRED)
find_package(fmt 7.1.0 REQUIRED)
find_package(ghcFilesystem 1.4.0 REQUIRED)
find_package(semver 0.3.0 REQUIRED)

find_package(CURL 7.69.1 REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(ZLIB 1.2.11 REQUIRED)
find_package(c-ares 1.17.1 REQUIRED)
find_package(Poco 1.11.0 REQUIRED)

if (${APPLE})
  set(APPLE_CXX_FLAGS " -faligned-allocation")
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}${APPLE_CXX_FLAGS}")
endif()

set(SOURCE_FILES
  include/nextclade_common/datasets.h
  include/nextclade_common/fetch.h
  include/nextclade_common/filesystem.h
  include/nextclade_common/openOutputFile.h
  src/datasets.cpp
  src/fetch.cpp
  src/generated/cainfo.h
  src/getCurlCodeString.h
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

  -DDATA_FULL_DOMAIN="${DATA_FULL_DOMAIN}"

  -DFMT_HEADER_ONLY=1
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
  nextclade_json
  ghcFilesystem::ghc_filesystem

  PRIVATE
  Boost::headers
  Microsoft.GSL::GSL
  fmt::fmt-header-only
  semver::semver
  TBB::tbb
  CURL::libcurl
  OpenSSL::OpenSSL
  ZLIB::ZLIB
  c-ares::c-ares
  Poco::Poco
  )
