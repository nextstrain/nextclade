#include "getAminoacidChanges.h"

#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <boost/algorithm/string/join.hpp>
#include <boost/range/combine.hpp>
#include <vector>

#include "../utils/contract.h"
#include "../utils/mapFind.h"
#include "../utils/range.h"

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

    /**
     * Removes duplicates from the array.
     * Requires type T to have operators `<` and `==` defined.
     */
    template<typename T>
    void removeDuplicates(std::vector<T>& aaSubstitutions) {
      std::sort(aaSubstitutions.begin(), aaSubstitutions.end());
      auto last = std::unique(aaSubstitutions.begin(), aaSubstitutions.end());
      aaSubstitutions.erase(last, aaSubstitutions.end());
    }
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
        if (!inRange(sub.pos, gene->start, gene->end)) {// TODO: Do we need to consider `frame` here?
          // This substitution is not in the gene, so it cannot influence the aminoacids in it
          continue;
        }

        invariant_greater_equal(sub.pos, gene->start);
        invariant_less(sub.pos, gene->end);
        const auto codon = (sub.pos - gene->start) / 3;// TODO: Do we need to consider `frame` here?

        invariant_greater_equal(codon, 0);
        invariant_less(codon, refPeptide.seq.size());
        invariant_less(codon, queryPeptide.seq.size());

        const auto& refAA = refPeptide.seq[codon];
        const auto& queryAA = queryPeptide.seq[codon];

        // Find the beginning of the affected codon as a nearest multiple of 3
        const auto codonBegin = sub.pos - (sub.pos % 3);
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
          .queryCodon = query.substr(codonBegin, 3),
        };

        // If the aminoacid is not changed after nucleotide substitutions, the mutation is said to be "silent".
        // This is due to genetic code redundancy.
        if (refAA == queryAA) {
          // This adds an element to the standalone array of silent substitutions
          aaSubstitutionsSilent.emplace_back(aaSub);
        } else {
          // This adds an element to the standalone array of substitutions
          aaSubstitutions.emplace_back(aaSub);

          // This **modifies** existing nucleotide substitution entry
          // to add associated aminoacid substitution
          sub.aaSubstitutions.push_back(aaSub);
        }
      }

      for (auto& del : deletions) {
        // Find overlapping between nucleotide deletion's range and gene's range
        const auto overlap =
          intersection({del.start, del.start + del.length}, {gene->start, gene->start + gene->length});

        if (!overlap) {
          continue;
        }

        int begin = overlap->first;
        int end = overlap->second;
        invariant_greater(begin, 0);
        invariant_less(end, ref.size());
        invariant_greater(end, begin);

        // Extend range to cover full codons...
        //   ...to the left
        if (begin > begin % 3) {// TODO: should this condition involve gene.start?
          begin -= begin % 3;
        }
        //   ...to the right
        // TODO: should we check against gene.end?
        end += (end % 3) - 1;

        invariant_greater(begin, 0);
        invariant_less(end, ref.size());
        invariant_greater(end, begin);

        for (int i = begin; i < end; i += 3) {
          const int codon = (i - gene->start) / 3;// TODO: Do we need to consider `frame` here?

          invariant_greater_equal(codon, 0);
          invariant_less(codon, refPeptide.seq.size());
          invariant_less(codon, queryPeptide.seq.size());

          const auto& refAA = refPeptide.seq[codon];
          const auto& queryAA = queryPeptide.seq[codon];

          const auto codonBegin = i;
          const auto codonEnd = codonBegin + 3;

          invariant_greater_equal(codonBegin, 0);
          invariant_less(codonEnd, ref.size());
          invariant_less(codonEnd, query.size());

          if (queryAA == Aminoacid::GAP) {// This is a deletion
            const auto aaDel = AminoacidDeletion{
              .refAA = refAA,
              .codon = codon,
              .gene = geneName,
              .nucRange = {.begin = codonBegin, .end = codonEnd},
              .refCodon = ref.substr(codonBegin, 3),
            };

            // This adds an element to the standalone array of deletions
            aaDeletions.emplace_back(aaDel);

            // This **modifies** existing nucleotide deletion entry
            // to add associated aminoacid deletions (possibly multiple)
            del.aaDeletions.push_back(aaDel);
          } else {// This is a substitution

            const auto aaSub = AminoacidSubstitution{
              .refAA = refAA,
              .queryAA = queryAA,
              .codon = codon,
              .gene = geneName,
              .nucRange = {.begin = codonBegin, .end = codonEnd},
              .refCodon = ref.substr(codonBegin, 3),
              .queryCodon = query.substr(codonBegin, 3),
            };

            // If the aminoacid is not changed after nucleotide substitutions, the mutation is said to be "silent".
            // This is due to genetic code redundancy.
            if (refAA == queryAA) {
              // This adds an element to the standalone array of silent substitutions
              aaSubstitutionsSilent.emplace_back(aaSub);
            } else {
              // This adds an element to the standalone array of substitutions
              aaSubstitutions.emplace_back(aaSub);

              // This **modifies** existing nucleotide substitution entry
              // to add associated aminoacid substitution
              del.aaSubstitutions.push_back(aaSub);
            }
          }
        }
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
