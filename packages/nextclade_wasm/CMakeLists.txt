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

set(EMSCRIPTEN_COMPILER_FLAGS "\
  -frtti \
  --bind \
  --source-map-base './' \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s WASM=1 \
  -s DEMANGLE_SUPPORT=1 \
  -s ALIASING_FUNCTION_POINTERS=0 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MALLOC=emmalloc \
  -s DISABLE_EXCEPTION_CATCHING=2 \
  -s ENVIRONMENT=worker \
")

set(EMSCRIPTEN_COMPILER_FLAGS_DEBUG "\
  -g4 \
  -O0 \
  -s ASSERTIONS=1 \
  -s SAFE_HEAP=1 \
  -s STACK_OVERFLOW_CHECK=2 \
")

set_target_properties(${PROJECT_NAME} PROPERTIES COMPILE_FLAGS ${EMSCRIPTEN_COMPILER_FLAGS})
set_target_properties(${PROJECT_NAME} PROPERTIES LINK_FLAGS ${EMSCRIPTEN_COMPILER_FLAGS})

set_target_properties(${PROJECT_NAME} PROPERTIES COMPILE_FLAGS_DEBUG ${EMSCRIPTEN_COMPILER_FLAGS_DEBUG})
set_target_properties(${PROJECT_NAME} PROPERTIES LINK_FLAGS_DEBUG ${EMSCRIPTEN_COMPILER_FLAGS_DEBUG})


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
  nextclade

  PRIVATE
  Boost::headers
  Microsoft.GSL::GSL
  fmt::fmt
  )
