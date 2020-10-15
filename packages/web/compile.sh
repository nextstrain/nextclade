#!/bin/bash

set -e

set -x

#export OPTIMIZE="-Os"
#export LDFLAGS="${OPTIMIZE}"
#export CFLAGS="${OPTIMIZE}"
#export CXXFLAGS="${OPTIMIZE}"

#rm -rf src/wasm/*
mkdir -p src/wasm

#pushd obj >/dev/null
#
#em++ \
#-o add.html \
#../src/add.cpp
#
#popd >/dev/null

#emcc \
#  -s "ENVIRONMENT='web'" \
#  ../algorithms/src/add.cpp \
#  -o src/wasm/add.js

#  --std=c++17 \


emcc \
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
  -s ENVIRONMENT=web \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -I ../algorithms/3rdparty \
  ../algorithms/src/add.cpp \
  -o src/wasm/add.js

#  -s "EXPORT_NAME='entry'" \
#  -s NO_EXIT_RUNTIME=1 \
#  -s EXTRA_EXPORTED_RUNTIME_METHODS='[\"cwrap\"]' \
#  -g \
#  -O0 \
#-s WASM=1 \
#-s STANDALONE_WASM \
#  --bind \
#  -s MODULARIZE=1 \
#  -s ALLOW_MEMORY_GROWTH=1 \
#  -s MALLOC=emmalloc \
#  -s MODULARIZE=1 \
#  -s EXPORT_ES6=1 \
#  -s STRICT=1 \
#  -s ASSERTIONS=0 \
#  -s EXTRA_EXPORTED_RUNTIME_METHODS=[\"cwrap\"] \
#  -s EXPORT_NAME=\"add\" \

#-s ASSERTIONS=1 \
#--bind \
#${OPTIMIZE} \
#--no-entry \
#-s MALLOC=emmalloc \
#-s STRICT=1 \
#-s ALLOW_MEMORY_GROWTH=1 \
#-s MODULARIZE=1 \
#-s EXPORT_ES6=1 \

#NODE_ENV=development webpack

echo "done"
