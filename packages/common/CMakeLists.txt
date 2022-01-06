cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
include(CFlags)
include(Quiet)
include(Sanitizers)

project(common DESCRIPTION "Common functions used in other packages")

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(Boost 1.75.0 COMPONENTS headers REQUIRED)
find_package(fmt 7.1.0 REQUIRED)

add_library(${PROJECT_NAME} STATIC
  include/common/contract.h
  include/common/copy.h
  include/common/debugbreak.h
  include/common/ieee754_comparison.h
  include/common/safe_vector.h
  src/common.cpp
  )

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

  -DENABLE_DEBUG_TRACE=${ENABLE_DEBUG_TRACE}

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
  )
