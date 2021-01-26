# Adds some useful C compiler flags

set(COOL_C_AND_CXX_FLAGS " \
-D_XOPEN_SOURCE=700 \
-Wall \
-Wextra \
-fno-strict-aliasing \
-ftrapv \
-fvisibility=hidden \
-pipe \
-Warray-bounds \
-Wconversion \
-Wdeprecated-declarations \
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
-Wno-cast-align \
-Wno-conversion \
-Wno-float-conversion \
-Wno-format-nonliteral \
-Wno-shadow \
-Wno-undef \
-Wno-unknown-pragmas \
-Wno-unused-parameter \
-Wno-unused-variable \
-Wno-zero-as-null-pointer-constant \
-Wpointer-arith \
-Wredundant-decls \
-Wshadow \
-Wsign-compare \
-Wstrict-overflow=5 \
-Wswitch-default \
-Wswitch-enum \
-Wtype-limits \
-Wundef \
-Wuninitialized \
-Wunreachable-code \
-Wwrite-strings \
")

set(COOL_C_FLAGS " \
${COOL_C_AND_CXX_FLAGS} \
-Wvla \
-Waggregate-return \
-Wcast-qual \
-Wstrict-prototypes \
-Wtype-limits \
-Werror=incompatible-pointer-types \
-Werror-implicit-function-declaration \
-Werror=int-conversion \
")

set(COOL_C_FLAGS_DEBUG " \
${COOL_C_FLAGS} \
-DDEBUG=1 \
-g \
-O0 \
-fstack-protector-all \
-fno-inline \
")

set(COOL_C_FLAGS_DEBUG_FAST " \
${COOL_C_FLAGS} \
-DDEBUG=1 \
-g \
-O0 \
-fstack-protector-all \
-fno-inline \
")

set(COOL_C_FLAGS_RELEASE " \
${COOL_C_FLAGS} \
-DNDEBUG=1 \
-fomit-frame-pointer \
")

set(CMAKE_C_FLAGS_SANITIZE "\
${COOL_C_FLAGS} \
-g \
-O1 \
-DNDEBUG=1 \
-fno-omit-frame-pointer \
-fno-optimize-sibling-calls \
")


set(COOL_C_FLAGS_DEBUG_FAST_GCC " \
-fno-inline-small-functions \
")

set(COOL_C_FLAGS_GCC " \
${COOL_C_FLAGS} \
-fdiagnostics-color \
")

set(COOL_C_FLAGS_GCC5 " \
${COOL_C_FLAGS_GCC} \
-Wcast-qual \
-Wvector-operation-performance \
")

set(COOL_C_FLAGS_GCC6 " \
${COOL_C_FLAGS_GCC5} \
-Wduplicated-cond \
-Wmisleading-indentation \
-Wnull-dereference \
-Wshift-negative-value \
-Wshift-overflow=2 \
")

set(COOL_C_FLAGS_GCC7 " \
${COOL_C_FLAGS_GCC6} \
-Wrestrict \
-Wvla-larger-than=1 \
-Wdangling-else \
-Walloc-zero \
-Wnonnull \
")

set(COOL_C_FLAGS_GCC8 " \
${COOL_C_FLAGS_GCC7} \
-Wmultistatement-macros \
-Wif-not-aligned \
-Wmissing-attributes \
")

set(COOL_EXE_LINKER_FLAGS_GCC "")
set(COOL_EXE_LINKER_FLAGS_GCC_DEBUG "")
set(COOL_EXE_LINKER_FLAGS_GCC_RELEASE "")
set(COOL_SHARED_LINKER_FLAGS_GCC "")
set(COOL_SHARED_LINKER_FLAGS_GCC_DEBUG "")
set(COOL_SHARED_LINKER_FLAGS_GCC_RELEASE "")


set(COOL_C_FLAGS_CLANG " \
-Reverything \
-Wabsolute-value \
-Wcomma \
-Wloop-analysis \
-Wmove \
-Wnull-dereference \
-Wrange-loop-analysis \
-Wshift-negative-value \
-Wshift-overflow \
-Wtautological-undefined-compare \
")

set(COOL_C_FLAGS_CLANG4 " \
${COOL_C_FLAGS_CLANG} \
-fstrict-vtable-pointers \
")

set(COOL_C_FLAGS_CLANG5 " \
${COOL_C_FLAGS_CLANG4} \
-Wcast-qual \
-Wunused-lambda-capture \
")

set(COOL_C_FLAGS_CLANG6 " \
${COOL_C_FLAGS_CLANG5} \
-Wpragma-pack \
-Wpragma-pack-suspicious-include \
-Wtautological-compare \
-Wnull-pointer-arithmetic \
-fdouble-square-bracket-attributes \
")

set(COOL_EXE_LINKER_FLAGS_CLANG "")
set(COOL_EXE_LINKER_FLAGS_CLANG_DEBUG "")
set(COOL_EXE_LINKER_FLAGS_CLANG_RELEASE "")
set(COOL_SHARED_LINKER_FLAGS_CLANG "")
set(COOL_SHARED_LINKER_FLAGS_CLANG_DEBUG "")
set(COOL_SHARED_LINKER_FLAGS_CLANG_RELEASE "")


set(COOL_C_FLAGS_MSVC " \
/D_SCL_SECURE_NO_WARNINGS \
/D_CRT_SECURE_NO_WARNINGS \
/DNOMINMAX \
/DWIN32_LEAN_AND_MEAN \
")

set(COOL_C_FLAGS_MSVC_DEBUG "")

set(COOL_C_FLAGS_MSVC_RELEASE "")

set(COOL_EXE_LINKER_FLAGS_MSVC "/ignore:4099")

set(COOL_EXE_LINKER_FLAGS_MSVC_DEBUG "")

set(COOL_EXE_LINKER_FLAGS_MSVC_RELEASE "")

set(COOL_SHARED_LINKER_FLAGS_MSVC "/ignore:4099")

set(COOL_SHARED_LINKER_FLAGS_MSVC_DEBUG "")

set(COOL_SHARED_LINKER_FLAGS_MSVC_RELEASE "")


if (CMAKE_C_COMPILER_ID MATCHES "GNU")
  if (CMAKE_C_COMPILER_VERSION VERSION_GREATER_EQUAL 8)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_GCC8}")
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_DEBUG_FAST} ${COOL_C_FLAGS_DEBUG_FAST_GCC}")
  elseif (CMAKE_C_COMPILER_VERSION VERSION_GREATER 7)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_GCC7}")
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_DEBUG_FAST} ${COOL_C_FLAGS_DEBUG_FAST_GCC}")
  elseif (CMAKE_C_COMPILER_VERSION VERSION_GREATER 6)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_GCC6}")
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_DEBUG_FAST} ${COOL_C_FLAGS_DEBUG_FAST_GCC}")
  elseif (CMAKE_C_COMPILER_VERSION VERSION_GREATER 5)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_GCC5}")
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_DEBUG}")
  else ()
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_DEBUG}")
  endif ()

  set(CMAKE_C_FLAGS_RELEASE "${CMAKE_C_FLAGS} ${CMAKE_C_FLAGS_RELEASE} ${COOL_C_FLAGS_RELEASE}")
  set(CMAKE_C_FLAGS_SANITIZE "${CMAKE_C_FLAGS} ${CMAKE_C_FLAGS_SANITIZE} ${COOL_C_FLAGS_SANITIZE}")
  set(CMAKE_EXE_LINKER_FLAGS_RELEASE "${CMAKE_EXE_LINKER_FLAGS_RELEASE} ${COOL_SHARED_LINKER_FLAGS_GCC_RELEASE}")
  set(CMAKE_SHARED_LINKER_FLAGS_RELEASE "${CMAKE_SHARED_LINKER_FLAGS_RELEASE} ${COOL_EXE_LINKER_FLAGS_GCC_RELEASE}")

elseif (CMAKE_C_COMPILER_ID MATCHES "Clang")
  if (CMAKE_C_COMPILER_VERSION VERSION_GREATER_EQUAL 6)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_CLANG6}")
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_DEBUG_FAST}")
  elseif (CMAKE_C_COMPILER_VERSION VERSION_GREATER 5)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_CLANG5}")
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_DEBUG_FAST}")
  elseif (CMAKE_C_COMPILER_VERSION VERSION_GREATER 4)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_CLANG4}")
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_DEBUG_FAST}")
  else ()
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS} ${COOL_C_FLAGS_DEBUG}")
  endif ()


  set(CMAKE_C_FLAGS_RELEASE "${CMAKE_C_FLAGS} ${CMAKE_C_FLAGS_RELEASE} ${COOL_C_FLAGS_RELEASE}")
  set(CMAKE_C_FLAGS_SANITIZE "${CMAKE_C_FLAGS} ${CMAKE_C_FLAGS_SANITIZE} ${COOL_C_FLAGS_SANITIZE}")
  set(CMAKE_EXE_LINKER_FLAGS_RELEASE "${CMAKE_EXE_LINKER_FLAGS_RELEASE} ${COOL_SHARED_LINKER_FLAGS_CLANG_RELEASE}")
  set(CMAKE_SHARED_LINKER_FLAGS_RELEASE "${CMAKE_SHARED_LINKER_FLAGS_RELEASE} ${COOL_EXE_LINKER_FLAGS_CLANG_RELEASE}")

elseif (CMAKE_C_COMPILER_ID MATCHES "Intel")

elseif (CMAKE_C_COMPILER_ID MATCHES "MSVC")
  set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} ${COOL_MSVC_C_FLAGS}")
  set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${COOL_EXE_LINKER_FLAGS_MSVC}")
  set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} ${COOL_SHARED_LINKER_FLAGS_MSVC}")
endif ()


set(COOL_CXX_FLAGS " \
${COOL_C_AND_CXX_FLAGS} \
-Woverloaded-virtual \
-Wwrite-strings \
-fsized-deallocation \
")

set(COOL_CXX_FLAGS_DEBUG " \
${COOL_CXX_FLAGS} \
-DDEBUG=1 \
-g \
-O0 \
-fstack-protector-all \
-fno-inline \
")

set(COOL_CXX_FLAGS_DEBUG_FAST " \
${COOL_CXX_FLAGS} \
-DDEBUG=1 \
-g \
-O0 \
-fstack-protector-all \
-fno-inline \
")

set(COOL_CXX_FLAGS_RELEASE " \
${COOL_CXX_FLAGS} \
-DNDEBUG=1 \
-fomit-frame-pointer \
")

set(CMAKE_CXX_FLAGS_SANITIZE "\
${COOL_CXX_FLAGS} \
-g \
-O1 \
-DNDEBUG=1 \
-fno-omit-frame-pointer \
-fno-optimize-sibling-calls \
")


set(COOL_CXX_FLAGS_DEBUG_FAST_GCC "\
-fno-inline-small-functions \
")

set(COOL_CXX_FLAGS_GCC "\
-fdiagnostics-color \
-Wsized-deallocation \
")

set(COOL_CXX_FLAGS_GCC5 " \
${COOL_CXX_FLAGS_GCC} \
-Wcast-qual \
-Wvector-operation-performance \
")

set(COOL_CXX_FLAGS_GCC6 " \
${COOL_CXX_FLAGS_GCC5} \
-Wduplicated-cond \
-Wmisleading-indentation \
-Wnull-dereference \
-Wshift-negative-value \
-Wshift-overflow=2 \
")

set(COOL_CXX_FLAGS_GCC7 " \
${COOL_CXX_FLAGS_GCC6} \
-Wrestrict \
-Wvla-larger-than=1 \
-Wdangling-else \
-Walloc-zero \
-Wnonnull \
-Waligned-new \
")

set(COOL_CXX_FLAGS_GCC8 " \
${COOL_CXX_FLAGS_GCC7} \
-Wmultistatement-macros \
-Wif-not-aligned \
-Wmissing-attributes \
-Wold-style-cast \
")

set(COOL_EXE_LINKER_FLAGS_GCC "")
set(COOL_EXE_LINKER_FLAGS_GCC_DEBUG "")
set(COOL_EXE_LINKER_FLAGS_GCC_RELEASE "")
set(COOL_SHARED_LINKER_FLAGS_GCC "")
set(COOL_SHARED_LINKER_FLAGS_GCC_DEBUG "")
set(COOL_SHARED_LINKER_FLAGS_GCC_RELEASE "")


set(COOL_CXX_FLAGS_CLANG " \
${COOL_CXX_FLAGS} \
-Reverything \
-Wabsolute-value \
-Wcomma \
-Wloop-analysis \
-Wmove \
-Wnull-dereference \
-Wrange-loop-analysis \
-Wshift-negative-value \
-Wshift-overflow \
-Wtautological-undefined-compare \
")

set(COOL_CXX_FLAGS_CLANG4 " \
${COOL_CXX_FLAGS_CLANG} \
-fstrict-vtable-pointers \
")

set(COOL_CXX_FLAGS_CLANG5 " \
${COOL_CXX_FLAGS_CLANG4} \
-Wcast-qual \
-Wunused-lambda-capture \
")

set(COOL_CXX_FLAGS_CLANG6 " \
${COOL_CXX_FLAGS_CLANG5} \
-Wpragma-pack \
-Wpragma-pack-suspicious-include \
-Wtautological-compare \
-Wnull-pointer-arithmetic \
-fdouble-square-bracket-attributes \
")

set(COOL_EXE_LINKER_FLAGS_CLANG "")
set(COOL_EXE_LINKER_FLAGS_CLANG_DEBUG "")
set(COOL_EXE_LINKER_FLAGS_CLANG_RELEASE "")
set(COOL_SHARED_LINKER_FLAGS_CLANG "")
set(COOL_SHARED_LINKER_FLAGS_CLANG_DEBUG "")
set(COOL_SHARED_LINKER_FLAGS_CLANG_RELEASE "")


set(COOL_CXX_FLAGS_MSVC " \
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

set(COOL_CXX_FLAGS_MSVC_DEBUG "")

set(COOL_CXX_FLAGS_MSVC_RELEASE "")

set(COOL_EXE_LINKER_FLAGS_MSVC "/ignore:4099")

set(COOL_EXE_LINKER_FLAGS_MSVC_DEBUG "")

set(COOL_EXE_LINKER_FLAGS_MSVC_RELEASE "")

set(COOL_SHARED_LINKER_FLAGS_MSVC "/ignore:4099")

set(COOL_SHARED_LINKER_FLAGS_MSVC_DEBUG "")

set(COOL_SHARED_LINKER_FLAGS_MSVC_RELEASE "")


if (CMAKE_CXX_COMPILER_ID MATCHES "GNU")
  if (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 8)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${COOL_CXX_FLAGS_GCC8}")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} ${COOL_CXX_FLAGS} ${COOL_CXX_FLAGS_DEBUG_FAST_GCC} ${COOL_CXX_FLAGS_DEBUG_FAST}")
  elseif (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 7)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${COOL_CXX_FLAGS_GCC7}")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} ${COOL_CXX_FLAGS} ${COOL_CXX_FLAGS_DEBUG_FAST_GCC} ${COOL_CXX_FLAGS_DEBUG_FAST}")
  elseif (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 6)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${COOL_CXX_FLAGS_GCC6}")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} ${COOL_CXX_FLAGS} ${COOL_CXX_FLAGS_DEBUG_FAST_GCC} ${COOL_CXX_FLAGS_DEBUG_FAST}")
  elseif (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 5)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${COOL_CXX_FLAGS_GCC5}")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} ${COOL_CXX_FLAGS_DEBUG}")
  else ()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${COOL_CXX_FLAGS_GCC}")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} ${COOL_CXX_FLAGS_DEBUG}")
  endif ()

  set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} ${COOL_CXX_FLAGS_RELEASE}")
  set(CMAKE_CXX_FLAGS_SANITIZE "${CMAKE_CXX_FLAGS_SANITIZE} ${COOL_CXX_FLAGS_SANITIZE}")

elseif (CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  if (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 6)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${COOL_CXX_FLAGS_CLANG6}")
    set(CMAKE_CXX_FLAGS_DEBUG "${COOL_CXX_FLAGS_DEBUG_FAST}")
  elseif (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 5)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${COOL_CXX_FLAGS_CLANG5}")
    set(CMAKE_CXX_FLAGS_DEBUG "${COOL_CXX_FLAGS_DEBUG_FAST}")
  elseif (CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 4)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${COOL_CXX_FLAGS_CLANG4}")
    set(CMAKE_CXX_FLAGS_DEBUG "${COOL_CXX_FLAGS_DEBUG_FAST}")
  else ()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${COOL_CXX_FLAGS_CLANG}")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS} ${COOL_CXX_FLAGS_DEBUG}")
  endif ()

  set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} ${COOL_CXX_FLAGS_RELEASE}")
  set(CMAKE_CXX_FLAGS_SANITIZE "${CMAKE_CXX_FLAGS_SANITIZE} ${COOL_CXX_FLAGS_SANITIZE}")

elseif (CMAKE_CXX_COMPILER_ID MATCHES "Intel")

elseif (CMAKE_CXX_COMPILER_ID MATCHES "MSVC")
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${COOL_MSVC_CXX_FLAGS}")
  set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${COOL_EXE_LINKER_FLAGS_MSVC}")
  set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} ${COOL_SHARED_LINKER_FLAGS_MSVC}")
endif ()
