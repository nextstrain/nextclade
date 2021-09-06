#include "../src/translate/translate.h"

#include <gtest/gtest.h>

TEST(translate, TranslatesSimple) {
  constexpr const auto* const nucs =
    "ACG"// T
    "AGG"// R
    "GCG"// A
    "AAT"// N
    "TCG"// S
    "CTC"// L
    "GCT"// A
    "ACA"// T
    "GAA"// E
    ;

  EXPECT_EQ(toString(translate(toNucleotideSequence(nucs))), "TRANSLATE");
}

TEST(translate, TranslatesAligned3GapToGap) {
  constexpr const auto* const nucs =
    "ACG"// T
    "AGG"// R
    "---"// A
    "AAT"// N
    "TCG"// S
    "CTC"// L
    "GCT"// A
    "ACA"// T
    "GAA"// E
    ;

  EXPECT_EQ(toString(translate(toNucleotideSequence(nucs))), "TR-NSLATE");
}

TEST(translate, TranslatesMisaligned3GapToX) {
  constexpr const auto* const nucs =
    "ACG"// T
    "AGG"// R
    "GC-"// A
    "--T"// N
    "TCG"// S
    "CTC"// L
    "GCT"// A
    "ACA"// T
    "GAA"// E
    ;

  EXPECT_EQ(toString(translate(toNucleotideSequence(nucs))), "TRXXSLATE");
}

TEST(translate, TranslatesModulo3Plus1) {

  constexpr const auto* const nucs =
    // clang-format off
    /* 0 */ "ACG"  /* T */
    /* 1 */ "AGG"  /* R */
    /* 2 */ "GCG"  /* A */

    /* 3 */ "AAT"  /* N */
    /* 4 */ "TCG"  /* S */
    /* 5 */ "CTC"  /* L */

    /* 6 */ "GCT"  /* A */
    /* 7 */ "ACA"  /* T */
    /* 8 */ "GAA"  /* E */

    /* 9 */ "GAT"  /* D */
    // clang-format on
    ;

  EXPECT_EQ(toString(translate(toNucleotideSequence(nucs))), "TRANSLATED");
}

TEST(translate, TranslatesModulo3Plus2) {
  constexpr const auto* const nucs =
    // clang-format off
    /* 0 */ "ACG"  /* T */
    /* 1 */ "AGG"  /* R */
    /* 2 */ "GCG"  /* A */

    /* 3 */ "AAT"  /* N */
    /* 4 */ "TCG"  /* S */
    /* 5 */ "CTC"  /* L */

    /* 6 */ "GCT"  /* A */
    /* 7 */ "ACA"  /* T */
    /* 8 */ "ATC"  /* I */

    /* 9 */ "CAA"  /* Q */
    /* 10 */"AAT"  /* N */
    // clang-format on
    ;

  EXPECT_EQ(toString(translate(toNucleotideSequence(nucs))), "TRANSLATIQN");
}
