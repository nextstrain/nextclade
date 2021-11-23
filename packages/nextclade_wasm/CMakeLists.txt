cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
#include(CFlags)
include(Quiet)
include(Sanitizers)

project(nextclade_wasm)

set(CMAKE_INCLUDE_CURRENT_DIR ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

find_package(Boost 1.75.0 COMPONENTS headers REQUIRED)
find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(fmt 7.1.0 REQUIRED)

add_executable(${PROJECT_NAME}
  src/main.cpp
  )

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
  set_target_properties(${PROJECT_NAME} PROPERTIES COMPILE_FLAGS "${NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS} -s DISABLE_EXCEPTION_CATCHING=0")
  set_target_properties(${PROJECT_NAME} PROPERTIES LINK_FLAGS "${NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS} -s DISABLE_EXCEPTION_CATCHING=0")
endif ()

set(INSTALLABLE_FILES
  ${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.js
  ${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.wasm
  )

install(TARGETS ${PROJECT_NAME} RUNTIME DESTINATION wasm)
install(
  FILES
  ${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.wasm.map
  DESTINATION wasm
  CONFIGURATIONS Debug
)

install(
  FILES
  ${INSTALLABLE_FILES}
  DESTINATION wasm
)

set_property(TARGET ${PROJECT_NAME} PROPERTY C_STANDARD 11)
set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 17)

target_compile_definitions(${PROJECT_NAME}
  PRIVATE
  -DPROJECT_NAME="${PROJECT_NAME}"
  -DPROJECT_VERSION="${NEXTCLADE_CPP_VERSION}"
  -DNEXTALIGN_VERSION="${NEXTCLADE_CPP_VERSION}"

  -DENABLE_DEBUG_TRACE=${ENABLE_DEBUG_TRACE}

  -DFMT_HEADER_ONLY=1
  )

target_include_directories(${PROJECT_NAME}
  PUBLIC
  "${CMAKE_CURRENT_SOURCE_DIR}/include"
  )

target_include_directories(${PROJECT_NAME} SYSTEM
  PRIVATE
  "${CMAKE_SOURCE_DIR}/3rdparty/boost/include"
  "${CMAKE_SOURCE_DIR}/3rdparty/frozen/include"
  )

target_link_libraries(${PROJECT_NAME}
  PUBLIC
  nextclade_json
  nextclade

  PRIVATE
  Boost::headers
  Microsoft.GSL::GSL
  fmt::fmt
  )
