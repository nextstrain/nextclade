#include "alignPairwise.h"

#include <string>
#include <vector>

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wfloat-equal"
#pragma clang diagnostic ignored "-Wcast-qual"
#pragma clang diagnostic ignored "-Wold-style-cast"
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wfloat-equal"
#pragma GCC diagnostic ignored "-Wcast-qual"
#pragma GCC diagnostic ignored "-Wold-style-cast"
#include <seqan3/alignment/aligned_sequence/all.hpp>
#include <seqan3/alignment/configuration/all.hpp>
#include <seqan3/alignment/pairwise/all.hpp>
#include <seqan3/alphabet/nucleotide/dna15.hpp>
#pragma GCC diagnostic pop
#pragma clang diagnostic pop


inline seqan3::dna15_vector to_dna15(const std::string& s) {
  seqan3::dna15_vector v;
  v.resize(s.size());

  for (size_t i = 0; i < s.size(); ++i)
    v[i].assign_char(s[i]);

  return v;
}

template<typename Container>
inline std::string from_dna15(const Container& v) {
  std::string s;
  s.resize(v.size());

  for (size_t i = 0; i < v.size(); ++i)
    s[i] = v[i].to_char();

  return s;
}

Alignment alignPairwise(const std::string& query, const std::string& ref, int minimalLength) {
  seqan3::dna15_vector s1 = to_dna15(query);
  seqan3::dna15_vector s2 = to_dna15(ref);

  // Configure the alignment kernel.
  auto config = seqan3::align_cfg::method_global{} |
                seqan3::align_cfg::scoring_scheme{seqan3::nucleotide_scoring_scheme{}} |
                seqan3::align_cfg::output_alignment{} | seqan3::align_cfg::output_score{};


  auto results = seqan3::align_pairwise(std::tie(s1, s2), config);

  auto& res = *results.begin();
  const auto& alignmentScore = res.score();
  const auto& alignment = res.alignment();
  const auto alignedQuery = from_dna15(std::get<0>(alignment));
  const auto alignedRef = from_dna15(std::get<1>(alignment));

  return {.query = alignedQuery, .ref = alignedRef, .alignmentScore = alignmentScore};
}
