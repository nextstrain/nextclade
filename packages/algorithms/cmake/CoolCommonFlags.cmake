# Adds some useful compiler flags


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
-Wno-format-nonliteral \
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
-Wno-unused-parameter \
-Wno-unused-variable \
-Wno-cast-align \
-Wno-undef \
-Wno-shadow \
-Wno-zero-as-null-pointer-constant \
-Wno-conversion \
-Wno-float-conversion \
-Wno-unknown-pragmas \
")
