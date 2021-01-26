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
