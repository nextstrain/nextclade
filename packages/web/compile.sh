#!/bin/bash

set -e

source emsdk_env.sh

#export OPTIMIZE="-Os"
#export LDFLAGS="${OPTIMIZE}"
#export CFLAGS="${OPTIMIZE}"
#export CXXFLAGS="${OPTIMIZE}"

rm -rf obj/*

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

emcc \
  --bind \
  -O3 \
  -s WASM=1 \
  -s EXTRA_EXPORTED_RUNTIME_METHODS='[\"cwrap\"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s "ENVIRONMENT='web'" \
  -s "EXPORT_NAME='main'" \
  ../algorithms/src/add.cpp \
  -o src/wasm/add.webassembly.js


#/home/ia/opt/emscripten/upstream/bin/clang \
#--target=wasm32 \
#-nostdlib \
#-Wl,--no-entry -Wl,--export-all \
#../algorithms/src/add.cpp \
#-o src/wasm/add.wasm

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
