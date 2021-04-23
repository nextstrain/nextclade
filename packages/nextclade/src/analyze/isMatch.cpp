#include "isMatch.h"

#include <frozen/map.h>
#include <frozen/set.h>
#include <nextclade/nextclade.h>

#include <optional>

#include "utils/mapFind.h"

namespace Nextclade {
  constexpr const auto IupacNucCodes = frozen::make_map<Nucleotide, frozen::set<Nucleotide, 4>>({
    {Nucleotide::A, frozen::make_set<Nucleotide>({Nucleotide::A, Nucleotide::N, Nucleotide::N, Nucleotide::N})},
    {Nucleotide::C, frozen::make_set<Nucleotide>({Nucleotide::C, Nucleotide::N, Nucleotide::N, Nucleotide::N})},
    {Nucleotide::G, frozen::make_set<Nucleotide>({Nucleotide::G, Nucleotide::N, Nucleotide::N, Nucleotide::N})},
    {Nucleotide::T, frozen::make_set<Nucleotide>({Nucleotide::T, Nucleotide::N, Nucleotide::N, Nucleotide::N})},
    {Nucleotide::R, frozen::make_set<Nucleotide>({Nucleotide::A, Nucleotide::G, Nucleotide::N, Nucleotide::N})},
    {Nucleotide::Y, frozen::make_set<Nucleotide>({Nucleotide::C, Nucleotide::T, Nucleotide::N, Nucleotide::N})},
    {Nucleotide::S, frozen::make_set<Nucleotide>({Nucleotide::G, Nucleotide::C, Nucleotide::N, Nucleotide::N})},
    {Nucleotide::W, frozen::make_set<Nucleotide>({Nucleotide::A, Nucleotide::T, Nucleotide::N, Nucleotide::N})},
    {Nucleotide::K, frozen::make_set<Nucleotide>({Nucleotide::G, Nucleotide::T, Nucleotide::N, Nucleotide::N})},
    {Nucleotide::M, frozen::make_set<Nucleotide>({Nucleotide::A, Nucleotide::C, Nucleotide::N, Nucleotide::N})},
    {Nucleotide::B, frozen::make_set<Nucleotide>({Nucleotide::C, Nucleotide::G, Nucleotide::T, Nucleotide::N})},
    {Nucleotide::D, frozen::make_set<Nucleotide>({Nucleotide::A, Nucleotide::G, Nucleotide::T, Nucleotide::N})},
    {Nucleotide::H, frozen::make_set<Nucleotide>({Nucleotide::A, Nucleotide::C, Nucleotide::T, Nucleotide::N})},
    {Nucleotide::V, frozen::make_set<Nucleotide>({Nucleotide::A, Nucleotide::C, Nucleotide::G, Nucleotide::N})},
    {Nucleotide::N, frozen::make_set<Nucleotide>({Nucleotide::A, Nucleotide::C, Nucleotide::G, Nucleotide::T})},
  });

  bool nucSetCompare(Nucleotide left, Nucleotide right) {
    if (left == Nucleotide::N && right == Nucleotide::N) {
      return true;
    }

    return left < right;
  }

  std::optional<frozen::set<Nucleotide, 4>> iupacNucCodes(Nucleotide nuc) {
    return mapFind(IupacNucCodes, nuc);
  }

  bool isMatch(Nucleotide query, Nucleotide reference) {
    // simple match or ambiguous
    if (query == reference || query == Nucleotide::N || reference == Nucleotide::N) {
      return true;
    }

    // match ambiguity code in query
    if (iupacNucCodes(query) && has(*iupacNucCodes(query), reference)) {
      return true;
    }

    // match ambiguity code in reference
    if (iupacNucCodes(reference) && has(*iupacNucCodes(reference), query)) {
      return true;
    }

    // if none of the previous matched, match generic ambiguity
    const auto queryNucs = iupacNucCodes(query);
    const auto refNucs = iupacNucCodes(reference);
    if (queryNucs && refNucs) {
      return have_intersection(*queryNucs, *refNucs, nucSetCompare);
    }

    return false;
  }


}//namespace Nextclade
