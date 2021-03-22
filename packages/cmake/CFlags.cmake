# Adds some useful C compiler flags


####################### GCC ###################################################
if (CMAKE_CXX_COMPILER_ID MATCHES "GNU")
  set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS_DEBUG} \
  -fno-inline-small-functions \
  ")

  set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} \
  -fno-inline-small-functions \
  ")

  set(C_CXX_FLAGS "${C_CXX_FLAGS} \
  -Walloc-zero \
  -Wattribute-alias \
  -Wduplicated-branches \
  -Wduplicated-cond \
  -Wformat-overflow \
  -Wformat-truncation \
  -Wif-not-aligned \
  -Wlogical-op \
  -Wmissing-attributes \
  -Wmultistatement-macros \
  -Wrestrict \
  -Wshift-overflow=2 \
  -Wstringop-truncation \
  -Wvector-operation-performance \
  -Wvla-larger-than=1 \
  ")

  set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} \
  -Wabsolute-value \
  -Wjump-misses-init \
  ")

  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} \
  -Wuseless-cast \
  -Waligned-new \
  -Wsized-deallocation \
  ")

endif ()

####################### Clang ##################################################
if (CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  set(C_CXX_FLAGS "${C_CXX_FLAGS} \
  -Reverything \
  -Wabsolute-value \
  -Wbitwise-conditional-parentheses \
  -Wbitwise-op-parentheses \
  -Wc99-designator \
  -Wcomma \
  -Wextra-semi \
  -Wfinal-dtor-non-final-class \
  -Wlogical-op-parentheses \
  -Wloop-analysis \
  -Wmove \
  -Wno-c++20-designator \
  -Wnull-pointer-arithmetic \
  -Wpragma-pack \
  -Wpragma-pack-suspicious-include \
  -Wrange-loop-analysis \
  -Wrange-loop-bind-reference \
  -Wreorder-init-list \
  -Wself-assign \
  -Wself-assign-field \
  -Wsizeof-array-div \
  -Wtautological-bitwise-compare \
  -Wtautological-overlap-compare \
  -Wtautological-undefined-compare \
  -Wunused-lambda-capture \
  -Wxor-used-as-pow \
  -fdouble-square-bracket-attributes \
  -fstrict-vtable-pointers \
  ")

  set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} \
  ")

  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} \
  ")

  set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS_DEBUG} \
  -fstandalone-debug \
  ")

  set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} \
  -fstandalone-debug \
  ")

endif ()

if (APPLE)
  set(C_CXX_FLAGS "${C_CXX_FLAGS} \
  -Wno-c++2a-designator \
  -Wno-unknown-warning-option \
  ")
endif ()


####################### GCC and CLANG ##########################################
if (CMAKE_CXX_COMPILER_ID MATCHES "GNU" OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  set(C_CXX_FLAGS " \
  ${C_CXX_FLAGS} \
  -Wall \
  -Wextra \
  -fdiagnostics-color \
  -fno-strict-aliasing \
  -ftree-vectorize \
  -funroll-loops \
  -pipe \
  -Warray-bounds \
  -Wcast-qual \
  -Wconversion \
  -Wdangling-else \
  -Wdeprecated-declarations \
  -Wdouble-promotion \
  -Wempty-body \
  -Wfloat-conversion \
  -Wfloat-equal \
  -Wformat-extra-args \
  -Wformat-nonliteral \
  -Wformat-security \
  -Wformat-y2k \
  -Wformat-zero-length \
  -Wformat=2 \
  -Wignored-qualifiers \
  -Winit-self \
  -Wmisleading-indentation \
  -Wno-unknown-pragmas \
  -Wnonnull \
  -Wnull-dereference \
  -Wpointer-arith \
  -Wredundant-decls \
  -Wshadow \
  -Wshift-negative-value \
  -Wshift-overflow \
  -Wsign-compare \
  -Wsizeof-pointer-div \
  -Wstrict-overflow=5 \
  -Wswitch-default \
  -Wswitch-enum \
  -Wtautological-compare \
  -Wtype-limits \
  -Wundef \
  -Wuninitialized \
  -Wunreachable-code \
  -Wwrite-strings \
  ")

  # TODO: remove these and fix the warnings!
  set(C_CXX_FLAGS " \
  ${C_CXX_FLAGS} \
  -Wno-conversion \
  -Wno-sign-compare \
  -Wno-sign-conversion \
  -Wno-strict-overflow \
  -Wno-unused-parameter \
  ")

  set(C_FLAGS " ${C_FLAGS} \
  -Waggregate-return \
  -Wcast-qual \
  -Wimplicit-function-declaration \
  -Wincompatible-pointer-types \
  -Wint-conversion \
  -Wstrict-prototypes \
  -Wvla \
  ")

  set(CXX_FLAGS "${CXX_FLAGS} \
  -Wextra-semi \
  -Wold-style-cast \
  -Woverloaded-virtual \
  -fsized-deallocation \
  ")

  set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${C_CXX_FLAGS} ${C_FLAGS}")

  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${C_CXX_FLAGS} ${CXX_FLAGS}")

  set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS_DEBUG} \
  -DDEBUG=1 \
  -fstack-protector-all \
  -fno-inline \
  -fno-omit-frame-pointer \
  -fno-optimize-sibling-calls \
  ")

  set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} \
  -DDEBUG=1 \
  -fstack-protector-all \
  -fno-inline \
  -fno-omit-frame-pointer \
  -fno-optimize-sibling-calls \
  ")

  set(CMAKE_C_FLAGS_RELEASE "${CMAKE_C_FLAGS_RELEASE} \
  -DNDEBUG=1 \
  -fomit-frame-pointer \
  ")

  set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} \
  -DNDEBUG=1 \
  -fomit-frame-pointer \
  ")

endif ()

####################### Visual C++ #############################################
if (CMAKE_CXX_COMPILER_ID MATCHES "MSVC")
  set(C_CXX_FLAGS "${C_CXX_FLAGS} \
  /D_CRT_SECURE_NO_WARNINGS \
  /D_SCL_SECURE_NO_WARNINGS \
  /DNOMINMAX \
  /DWIN32_LEAN_AND_MEAN \
  /permissive- \
  /W4 \
  /w14242 \
  /w14254 \
  /w14263 \
  /w14265 \
  /w14287 \
  /w14296 \
  /w14311 \
  /w14545 \
  /w14546 \
  /w14547 \
  /w14549 \
  /w14555 \
  /w14619 \
  /w14640 \
  /w14826 \
  /w14905 \
  /w14906 \
  /w14928 \
  /we4289 \
  ")

  set(LINKER_FLAGS "${LINKER_FLAGS} \
  /ignore:4099
  ")

  set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${C_CXX_FLAGS}")
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${C_CXX_FLAGS}")
  set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${LINKER_FLAGS}")
  set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} ${LINKER_FLAGS}")
endif ()
