cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

set(CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/packages/cmake" ${CMAKE_MODULE_PATH})
#include(CFlags)
include(Quiet)
include(Sanitizers)

project(nextclade)

set(CMAKE_INCLUDE_CURRENT_DIR ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_INSTALL_MESSAGE LAZY)

find_package(Microsoft.GSL 3.1.0 REQUIRED)
find_package(boost_base 1.68.0 REQUIRED)
find_package(fast-cpp-csv-parser 20191004 REQUIRED)
find_package(fmt 7.1.0 REQUIRED)
find_package(type_safe 0.2.1 REQUIRED)

set(SOURCE_FILES
  include/nextclade/nextclade.h
  src/add.cpp
  src/add.h
  src/bbb.cpp
  src/bbb.h
  src/wasm.cpp
  )

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
  add_executable(${PROJECT_NAME} ${SOURCE_FILES})

  set(EMSCRIPTEN_COMPILER_FLAGS "\
    -frtti \
    --bind \
    --source-map-base './' \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s WASM=1 \
    -s DEMANGLE_SUPPORT=1 \
    -s ALIASING_FUNCTION_POINTERS=0 \
    -s MALLOC=emmalloc \
    -s DISABLE_EXCEPTION_CATCHING=2 \
    -s ENVIRONMENT=worker \
    \
    -pthread \
    -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
    -s USE_PTHREADS=1 \
    -s PTHREAD_POOL_SIZE=4 \
    -s EXPORT_NAME='ExampleModuleFactory' \
  ")
#    -s ALLOW_MEMORY_GROWTH=1 \

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

  install(TARGETS ${PROJECT_NAME} RUNTIME DESTINATION wasm)

  install(
    FILES
    ${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.js
    ${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.wasm
    ${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.wasm.map
    DESTINATION wasm
  )

else ()
  add_library(${PROJECT_NAME} STATIC ${SOURCE_FILES})
endif ()


set_property(TARGET ${PROJECT_NAME} PROPERTY C_STANDARD 11)
set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 17)

target_compile_definitions(${PROJECT_NAME}
  PRIVATE

  -DPROJECT_NAME="${PROJECT_NAME}"

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
  )

target_link_libraries(${PROJECT_NAME}
  PUBLIC

  PRIVATE
  Microsoft.GSL::GSL
  boost_base::boost_base
  fast-cpp-csv-parser::fast-cpp-csv-parser
  fmt::fmt
  type_safe::type_safe
  )

set(NEXTCLADE_BUILD_TESTS ON CACHE BOOL "Build unit tests")
if (${NEXTCLADE_BUILD_TESTS})
  #  include(CTest)
  #  enable_testing()
  #  add_subdirectory(tests)
endif ()

set(NEXTCLADE_BUILD_BENCHMARKS OFF CACHE BOOL "Build benchmarks")
if (${NEXTCLADE_BUILD_BENCHMARKS})
  #  add_subdirectory(benchmarks)
endif ()
