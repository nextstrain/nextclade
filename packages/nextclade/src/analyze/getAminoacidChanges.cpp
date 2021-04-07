#include "getAminoacidChanges.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <boost/algorithm/string/join.hpp>
#include <boost/range/combine.hpp>
#include <vector>

#include "../utils/contract.h"
#include "../utils/mapFind.h"

namespace Nextclade {


  namespace {
    template<typename Key, typename Value>
    std::vector<Key> keys(const std::map<Key, Value>& m) {
      std::vector<Key> result;
      std::transform(m.cbegin(), m.cend(), std::back_inserter(result), [](const auto& x) { return x.first; });
      return result;
    }

    std::vector<std::string> surroundWithQuotes(const std::vector<std::string>& m) {
      std::vector<std::string> result;
      std::transform(m.cbegin(), m.cend(), std::back_inserter(result),
        [](const auto& x) { return fmt::format("\"{}\"", x); });
      return result;
    }

    void removeDuplicates(std::vector<AminoacidSubstitution>& aaSubstitutions) {}

    void removeDuplicates(std::vector<AminoacidDeletion>& aaDeletions) {}

  }// namespace


  /**
   * Finds aminoacid substitutions and deletions in the query sequence
   *
   * @sideeffect Modifies parameters `substitutions` and `deletions`: for every entry it adds associated aminoacid changes
   */
  GetAminoacidChangesResult getAminoacidChanges(                   //
    const NucleotideSequence& ref,                                 //
    const NucleotideSequence& query,                               //
    const std::vector<PeptideInternal>& refPeptides,               //
    const std::vector<PeptideInternal>& queryPeptides,             //
    /* inout */ std::vector<NucleotideSubstitution>& substitutions,//
    /* inout */ std::vector<NucleotideDeletion>& deletions,        //
    const GeneMap& geneMap                                         //
  ) {

    std::vector<AminoacidSubstitution> aaSubstitutions;
    std::vector<AminoacidSubstitution> aaSubstitutionsSilent;
    std::vector<AminoacidDeletion> aaDeletions;

    const auto peptideZip = boost::combine(refPeptides, queryPeptides);
    for (const auto [refPeptide, queryPeptide] : peptideZip) {
      invariant_equal(refPeptide.name, queryPeptide.name);
      invariant_equal(refPeptide.seq.size(), queryPeptide.seq.size());

      const auto& geneName = refPeptide.name;

      const auto gene = mapFind(geneMap, geneName);
      if (!gene) {
        throw ErrorGeneNotFound(geneName, geneMap);
      }

      for (auto& sub : substitutions) {
        const auto codon = (sub.pos / 3) - gene->start;// TODO: Do we need to consider `frame` here?

        invariant_greater_equal(codon, 0);
        invariant_less(codon, refPeptide.seq.size());
        invariant_less(codon, queryPeptide.seq.size());

        const auto& refAA = refPeptide.seq[codon];
        const auto& queryAA = queryPeptide.seq[codon];

        const auto codonBegin = codon * 3;
        const auto codonEnd = codonBegin + 3;

        invariant_greater_equal(codonBegin, 0);
        invariant_less(codonEnd, ref.size());
        invariant_less(codonEnd, query.size());

        const auto aaSub = AminoacidSubstitution{
          .refAA = refAA,
          .queryAA = queryAA,
          .codon = codon,
          .gene = geneName,
          .nucRange = {.begin = codonBegin, .end = codonEnd},
          .refCodon = ref.substr(codonBegin, 3),
          .queryCodon = query.substr(codonEnd, 3),
        };

        // If aminoacid is not changed after nucleotide mutation, the mutation is said to be "silent"
        if (refAA == queryAA) {
          // This adds an element to the standalone array of substitution
          aaSubstitutionsSilent.emplace_back(aaSub);
        } else {
          // This adds an element to the standalone array of substitution
          aaSubstitutions.emplace_back(aaSub);

          // This **modifies** existing nucleotide substitution entry
          // to add associated aminoacid substitution
          sub.aaSubstitutions.push_back(aaSub);
        }
      }

      for (const auto& del : deletions) {
      }
    }

    // Adjacent nucleotide changes, if happened to be in the same codon,
    // might have produced duplicate aminoacid changes. Let's remove them.
    removeDuplicates(aaSubstitutions);
    removeDuplicates(aaSubstitutionsSilent);
    removeDuplicates(aaDeletions);

    return {
      .aaSubstitutions = aaSubstitutions,
      .aaDeletions = aaDeletions,
    };
  }

  ErrorGeneNotFound::ErrorGeneNotFound(const std::string& geneName, const GeneMap& geneMap)
      : std::runtime_error(fmt::format(//
          "When searching for aminoacid mutations: attempted to lookup gene \"{:s}\" in gene map, but not found. The "
          "genes present in the gene map: {}",
          geneName, boost::join(surroundWithQuotes(keys(geneMap)), ", "))) {}
}// namespace Nextclade
