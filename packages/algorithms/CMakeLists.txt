cmake_minimum_required(VERSION 3.10)
cmake_policy(SET CMP0069 NEW)

project(nextclade)


set(CMAKE_INCLUDE_CURRENT_DIR ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(Boost 1.74 REQUIRED)
find_package(cxxopts 2.2.1 REQUIRED)
find_package(fmt 7.1.0 REQUIRED)

add_executable(${PROJECT_NAME}
  src/cli.cpp
  )

set_property(TARGET ${PROJECT_NAME} PROPERTY C_STANDARD 11)
set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 20)

target_compile_definitions(${PROJECT_NAME}
  PRIVATE -DPROJECT_NAME="${PROJECT_NAME}"
  )

target_include_directories(${PROJECT_NAME}
  PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}/src"
  )

target_link_libraries(${PROJECT_NAME}
  Boost::Boost
  cxxopts::cxxopts
  fmt::fmt
  )

if (${CMAKE_SYSTEM_NAME} MATCHES "Emscripten")
  set_target_properties(${PROJECT_NAME} PROPERTIES
    LINK_FLAGS "\
      -s DEMANGLE_SUPPORT=1 \
      -frtti \
      -g4 \
      -O0 \
      -std=c++17 \
      --bind \
      --source-map-base './' \
      -s ALIASING_FUNCTION_POINTERS=0 \
      -s ALLOW_MEMORY_GROWTH=1 \
      -s MALLOC=emmalloc \
      -s ASSERTIONS=1 \
      -s DISABLE_EXCEPTION_CATCHING=2 \
      -s SAFE_HEAP=1 \
      -s STACK_OVERFLOW_CHECK=2 \
      -s ENVIRONMENT=worker \
      -s MODULARIZE=1 \
      -s EXPORT_ES6=1 \
  ")
endif ()

