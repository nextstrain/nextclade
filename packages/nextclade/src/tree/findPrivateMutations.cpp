/**
* This module implements search for *private* aminoacid mutations.
*
* Private mutations are the mutations in the query (user-provided) sequence relative to the parent node on the
* reference tree.
*
* We have an array of sequence mutations relative to reference and a map of node mutations relative to reference.
* We want to find private mutations. The following cases are possible:
* |---|--------------------------------------------------------------|---------|------------------------------|
* |   |                                                              |         |   Resulting private mutation |
* |---|                         Case                                 | Private |------------------------------|
* |   |                                                              |         |      From     |     To       |
* |---|--------------------------------------------------------------|---------|---------------|--------------|
* | 1 | mutation in sequence and in node, same query character       |   no    |      N/A      |     N/A      |
* |---|--------------------------------------------------------------|---------|---------------|--------------|
* | 2 | mutation in sequence and in node, but not the same character |   yes   |    node.qry   |   seq.qry    |
* |---|--------------------------------------------------------------|---------|---------------|--------------|
* | 3 | mutation in sequence but not in node                         |   yes   |    seq.ref    |   seq.qry    |
* |---|--------------------------------------------------------------|---------|---------------|--------------|
* | 4 | mutation in node, but not in sequence, aka "reversion"       |   yes   |    node.qry   |   node.ref   |
* |   | (mutation in sequence that reverts the character to ref seq) |         |               |              |
* |---|--------------------------------------------------------------|---------|---------------|--------------|
* | 5 | unknown in sequence, mutation in node                        |   no    |      N/A      |     N/A      |
* |---|--------------------------------------------------------------|---------|---------------|--------------|
* | 6 | unknown in sequence, no mutation in node                     |   no    |      N/A      |     N/A      |
* |---|--------------------------------------------------------------|---------|---------------|--------------|
*
* At this point sequence have not yet become a new node on the tree, but is described by the results of the previous
* analysis steps.
*
*/
#include "findPrivateMutations.h"

#include <common/safe_vector.h>
#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <algorithm>
#include <map>

#include "../analyze/isSequenced.h"
#include "../analyze/nucleotide.h"
#include "../utils/at.h"
#include "../utils/concat_move.h"
#include "../utils/eraseDuplicates.h"
#include "../utils/filter.h"
#include "../utils/mapFind.h"
#include "../utils/range.h"
#include "utils/concat.h"


namespace Nextclade {
  namespace {

    /** Intermediate results, after labeling. At this point we no longer have reversions (see struct above). */
    template<typename Letter>
    struct LabelPrivateMutationsResult {
      // Mutations for which there's a label in the label map
      safe_vector<SubstitutionSimpleLabeled<Letter>> labeledSubstitutions;
      safe_vector<DeletionSimpleLabeled<Letter>> labeledDeletions;

      // Mutations for which there's no label in the label map
      safe_vector<SubstitutionSimple<Letter>> unlabeledSubstitutions;
      safe_vector<DeletionSimple<Letter>> unlabeledDeletions;
    };

    /** Generic version of isSequenced() function */
    template<typename Letter>
    bool isSequencedGeneric(int pos, const AnalysisResult& seq, LetterTag<Letter>);

    /** Generic version of isSequenced() function: specialization for nucleotides */
    template<>
    bool isSequencedGeneric(int pos, const AnalysisResult& seq, LetterTag<Nucleotide>) {
      return isSequenced(pos, seq);
    }

    /** Generic version of isSequenced() function: specialization for amino acids */
    template<>
    bool isSequencedGeneric(int /*pos*/, const AnalysisResult& /*seq*/, LetterTag<Aminoacid>) {
      // For aminoacid sequences there is no concept of being not sequences currently. They are always sequenced.
      return true;
    }

    /** Check if this position is included into one of the ranges with unknown aminoacids (aminoacid `X`) */
    bool isUnknownAa(int pos, const safe_vector<GeneAminoacidRange>& unknownAaRanges) {
      // If in any of the genes
      // (should be only 1 gene at this point, but there might be multiple entries for same gene)...
      return std::any_of(unknownAaRanges.cbegin(), unknownAaRanges.end(), [pos](const GeneAminoacidRange& geneUnk) {
        // ...if any of the unknown AA ranges within that gene...
        return std::any_of(geneUnk.ranges.cbegin(), geneUnk.ranges.end(), [pos](const AminoacidRange& unk) {
          // ...includes the given position, then this position contains an unknown aminoacid
          return inRange(pos, Range{unk.begin, unk.end});
        });
      });
    }


    /**
     * Iterates over sequence substitutions, compares sequence and node substitutions and finds the private ones.
     *
     * This function is generic and is suitable for both nucleotide and aminoacid substitutions.
     */
    template<typename Letter>
    void processSeqSubstitutions(                                               //
      /* in */ const std::map<int, Letter>& nodeMutMap,                         //
      /* in */ const safe_vector<Substitution<Letter>>& substitutions,          //
      /* inout */ safe_vector<SubstitutionSimple<Letter>>& privateSubstitutions,//
      /* inout */ std::set<int>& seqPositionsMutatedOrDeleted                   //
    ) {
      for (const auto& seqMut : substitutions) {
        const auto& pos = seqMut.pos;
        seqPositionsMutatedOrDeleted.insert(pos);

        if (isUnknown(seqMut.qry)) {
          // Cases 5/6: Unknown in sequence
          // Action: Skip nucleotide N and aminoacid X in sequence.
          //         We don't know whether they match the node character or not,
          //         so we decide to not take them into account.
          continue;
        }

        const auto& nodeQueryChar = mapFind(nodeMutMap, pos);
        if (!nodeQueryChar) {
          // Case 3: Mutation in sequence but not in node, i.e. a newly occurred mutation.
          // Action: Add the sequence mutation itself.
          privateSubstitutions.emplace_back(
            SubstitutionSimple<Letter>{.ref = seqMut.ref, .pos = pos, .qry = seqMut.qry});
        } else if (seqMut.qry != nodeQueryChar) {
          // Case 2: Mutation in sequence and in node, but the query character is not the same.
          // Action: Add mutation from node query character to sequence query character.
          privateSubstitutions.emplace_back(
            SubstitutionSimple<Letter>{.ref = *nodeQueryChar, .pos = pos, .qry = seqMut.qry});
        }

        // Otherwise case 1: mutation in sequence and in node, same query character, i.e. the mutation is not private:
        // nothing to do.
      }
    }

    /**
     * Iterates over sequence deletions, compares sequence and node deletion and finds the private ones.
     *
     * This is a generic declaration, but the implementation for nucleotide and aminoacid deletions is different and the
     * two specializations are provided below. This is due to deletions having different data structure for nucleotides
     * and for amino acids (range vs point).
     */
    template<typename Letter>
    void processSeqDeletions(                                           //
      /* in */ const std::map<int, Letter>& nodeMutMap,                 //
      /* in */ const safe_vector<Deletion<Letter>>& deletions,          //
      /* in */ const Sequence<Letter>& refSeq,                          //
      /* inout */ safe_vector<DeletionSimple<Letter>>& privateDeletions,//
      /* inout */ std::set<int>& seqPositionsMutatedOrDeleted           //
    );

    /** Specialization of `processSeqDeletions()` for nucleotides */
    template<>
    void processSeqDeletions(                                               //
      /* in */ const std::map<int, Nucleotide>& nodeMutMap,                 //
      /* in */ const safe_vector<Deletion<Nucleotide>>& deletions,          //
      /* in */ const Sequence<Nucleotide>& refSeq,                          //
      /* inout */ safe_vector<DeletionSimple<Nucleotide>>& privateDeletions,//
      /* inout */ std::set<int>& seqPositionsMutatedOrDeleted               //
    ) {
      for (const auto& del : deletions) {
        const auto& start = del.start;
        const auto& end = del.start + del.length;

        for (int pos = start; pos < end; ++pos) {
          const auto& nodeQueryNuc = mapFind(nodeMutMap, pos);
          seqPositionsMutatedOrDeleted.insert(pos);

          if (!nodeQueryNuc) {
            // Case 3: Deletion in sequence but not in node, i.e. a newly occurred deletion.
            // Action: Add the sequence deletion itself (take refNuc from reference sequence).
            const auto& refNuc = refSeq[pos];
            privateDeletions.emplace_back(DeletionSimple<Nucleotide>{.ref = refNuc, .pos = pos});
          } else if (!isGap(*nodeQueryNuc)) {
            // Case 2: Mutation in node but deletion in sequence (mutation to '-'), i.e. the query character is not the
            // same. Action: Add deletion of node query character.
            privateDeletions.emplace_back(DeletionSimple<Nucleotide>{.ref = *nodeQueryNuc, .pos = pos});
          }

          // Otherwise case 1: mutation in sequence and in node, same query character, i.e. the mutation is not private:
          // nothing to do.
        }
      }
    }

    /** Specialization of `processSeqDeletions()` for amino acids */
    template<>
    void processSeqDeletions(                                              //
      /* in */ const std::map<int, Aminoacid>& nodeMutMap,                 //
      /* in */ const safe_vector<Deletion<Aminoacid>>& deletions,          //
      /* in */ const Sequence<Aminoacid>& refSeq,                          //
      /* inout */ safe_vector<DeletionSimple<Aminoacid>>& privateDeletions,//
      /* inout */ std::set<int>& seqPositionsMutatedOrDeleted              //
    ) {
      for (const auto& del : deletions) {
        const auto& pos = del.pos;
        const auto& nodeQueryNuc = mapFind(nodeMutMap, pos);
        seqPositionsMutatedOrDeleted.insert(pos);

        if (!nodeQueryNuc) {
          // Case 3: Deletion in sequence but not in node, i.e. a newly occurred deletion.
          // Action: Add the sequence deletion itself (take refNuc from reference sequence).
          const auto& refNuc = at(refSeq, pos);
          privateDeletions.emplace_back(DeletionSimple<Aminoacid>{.ref = refNuc, .pos = pos});
        } else if (!isGap(*nodeQueryNuc)) {
          // Case 2: Mutation in node but deletion in sequence (mutation to '-'), i.e. the query character is not the
          // same. Action: Add deletion of node query character.
          privateDeletions.emplace_back(DeletionSimple<Aminoacid>{.ref = *nodeQueryNuc, .pos = pos});
        }

        // Otherwise case 1: mutation in sequence and in node, same query character, i.e. the mutation is not private:
        // nothing to do.
      }
    }


    /**
     * Iterates over node mutations, compares node and sequence mutations and finds reversions.
     *
     * This function is generic and is suitable for both nucleotide and aminoacid mutations. Substitutions and
     * deletions are handled in one go (nodes don't distinguish between them)
     */
    template<typename Letter>
    void findReversions(                                                                 //
      /* in */ const std::map<int, Letter>& nodeMutMap,                                  //
      /* in */ const AnalysisResult& seq,                                                //
      /* in */ const Sequence<Letter>& refSeq,                                           //
      /* in */ const std::set<int>& seqPositionsMutatedOrDeleted,                        //
      /* inout */ safe_vector<SubstitutionSimple<Letter>>& privateReversionSubstitutions,//
      /* inout */ safe_vector<DeletionSimple<Letter>>& privateReversionDeletions         //
    ) {
      for (const auto& [pos, nodeQueryNuc] : nodeMutMap) {
        const bool seqHasMutOrDel = has(seqPositionsMutatedOrDeleted, pos);
        const bool isSequenced = isSequencedGeneric(pos, seq, LetterTag<Letter>{});
        if (!seqHasMutOrDel && isSequenced && !isGap(nodeQueryNuc)) {
          // Case 4: Mutation in node, but not in sequence. This is a so-called reversion. Mutation in sequence reverts
          // the character to ref seq.
          // Action: Add mutation from node query character to character in reference sequence.
          const auto& refNuc = refSeq[pos];
          if (isGap<Letter>(refNuc)) {
            privateReversionDeletions.emplace_back(DeletionSimple<Letter>{.ref = nodeQueryNuc, .pos = pos});
          } else {
            privateReversionSubstitutions.emplace_back(
              SubstitutionSimple<Letter>{.ref = nodeQueryNuc, .pos = pos, .qry = refNuc});
          }
        }
      }
    }


    /**
   * Subdivides private mutations into labeled and unlabeled, according to label map.
   *
   * If there's a match in the label map, add mutation to the labelled list, and attach the corresponding labels.
   * If not, keep it in the unlabelled list.
   */
    template<typename Letter>
    LabelPrivateMutationsResult<Letter> labelPrivateMutations(
      const safe_vector<SubstitutionSimple<Letter>>& privateSubstitutions,
      const safe_vector<DeletionSimple<Letter>>& privateDeletions,
      const safe_vector<GenotypeLabeled<Letter>>& substitutionLabelMap,
      const safe_vector<GenotypeLabeled<Letter>>& deletionLabelMap) {

      // We use binary search, so we expect label maps to be sorted
      precondition(std::is_sorted(substitutionLabelMap.cbegin(), substitutionLabelMap.cend()));
      precondition(std::is_sorted(deletionLabelMap.cbegin(), deletionLabelMap.cend()));

      LabelPrivateMutationsResult<Letter> result;
      result.labeledSubstitutions.reserve(privateSubstitutions.size());
      result.unlabeledSubstitutions.reserve(privateSubstitutions.size());

      // NOTE: std::lower_bound is basically a binary search
      // TODO: binary search might be slower than needed. Perhaps try std::map here.
      for (const auto& substitution : privateSubstitutions) {
        auto match = std::find_if(substitutionLabelMap.cbegin(), substitutionLabelMap.cend(),
          [&substitution](const GenotypeLabeled<Letter>& labeled) { return labeled.genotype == substitution; });
        if (match != substitutionLabelMap.end()) {
          result.labeledSubstitutions.emplace_back(
            SubstitutionSimpleLabeled<Letter>{.substitution = substitution, .labels = match->labels});
        } else {
          result.unlabeledSubstitutions.push_back(substitution);
        }
      }

      result.labeledDeletions.reserve(privateDeletions.size());
      result.unlabeledDeletions.reserve(privateDeletions.size());
      for (const auto& deletion : privateDeletions) {
        auto match = std::find_if(deletionLabelMap.cbegin(), deletionLabelMap.cend(),
          [&deletion](const GenotypeLabeled<Letter>& labeled) { return labeled.genotype == deletion; });
        if (match != deletionLabelMap.end()) {
          result.labeledDeletions.emplace_back(
            DeletionSimpleLabeled<Letter>{.deletion = deletion, .labels = match->labels});
        } else {
          result.unlabeledDeletions.push_back(deletion);
        }
      }

      result.labeledSubstitutions.shrink_to_fit();
      result.labeledDeletions.shrink_to_fit();
      result.unlabeledSubstitutions.shrink_to_fit();
      result.unlabeledDeletions.shrink_to_fit();

      return result;
    }


    template<typename Letter>
    PrivateMutations<Letter> findPrivateMutations(                     //
      const std::map<int, Letter>& nodeMutMap,                         //
      const AnalysisResult& seq,                                       //
      const safe_vector<Substitution<Letter>> substitutions,           //
      const safe_vector<Deletion<Letter>> deletions,                   //
      const Sequence<Letter>& refSeq,                                  //
      const safe_vector<GenotypeLabeled<Letter>>& substitutionLabelMap,//
      const safe_vector<GenotypeLabeled<Letter>>& deletionLabelMap     //
    ) {

      safe_vector<SubstitutionSimple<Letter>> privateNonReversionSubstitutions;
      privateNonReversionSubstitutions.reserve(substitutions.size());

      safe_vector<DeletionSimple<Letter>> privateNonReversionDeletions;
      privateNonReversionDeletions.reserve(deletions.size());

      // Remember which positions we cover while iterating sequence mutations,
      // to be able to skip them when we iterate over node mutations
      std::set<int> seqPositionsMutatedOrDeleted;

      // Iterate over sequence substitutions
      processSeqSubstitutions(nodeMutMap, substitutions, privateNonReversionSubstitutions,
        seqPositionsMutatedOrDeleted);

      // Iterate over sequence deletions
      processSeqDeletions(nodeMutMap, deletions, refSeq, privateNonReversionDeletions, seqPositionsMutatedOrDeleted);

      safe_vector<SubstitutionSimple<Letter>> privateReversionSubstitutions;
      privateReversionSubstitutions.reserve(nodeMutMap.size());

      safe_vector<DeletionSimple<Letter>> privateReversionDeletions;
      privateReversionDeletions.reserve(nodeMutMap.size());

      // Iterate over node substitutions and deletions and find reversions
      findReversions(nodeMutMap, seq, refSeq, seqPositionsMutatedOrDeleted, privateReversionSubstitutions,
        privateReversionDeletions);

      eraseDuplicatesInPlace(privateNonReversionSubstitutions);
      eraseDuplicatesInPlace(privateNonReversionDeletions);

      privateNonReversionSubstitutions.shrink_to_fit();
      privateNonReversionDeletions.shrink_to_fit();

      const auto& afterLabeling = labelPrivateMutations(privateNonReversionSubstitutions, privateNonReversionDeletions,
        substitutionLabelMap, deletionLabelMap);

      auto privateSubstitutions = merge(privateReversionSubstitutions, privateNonReversionSubstitutions);
      auto privateDeletions = merge(privateReversionDeletions, privateNonReversionDeletions);

      auto totalPrivateSubstitutions = safe_cast<int>(privateSubstitutions.size());
      auto totalPrivateDeletions = safe_cast<int>(privateDeletions.size());
      auto totalReversionSubstitutions = safe_cast<int>(privateReversionSubstitutions.size());
      auto totalReversionDeletions = safe_cast<int>(privateReversionDeletions.size());
      auto totalLabeledSubstitutions = safe_cast<int>(afterLabeling.labeledSubstitutions.size());
      auto totalLabeledDeletions = safe_cast<int>(afterLabeling.labeledDeletions.size());
      auto totalUnlabeledSubstitutions = safe_cast<int>(afterLabeling.unlabeledSubstitutions.size());
      auto totalUnlabeledDeletions = safe_cast<int>(afterLabeling.unlabeledDeletions.size());

      return PrivateMutations<Letter>{
        .privateSubstitutions = privateSubstitutions,
        .privateDeletions = privateDeletions,
        .reversionSubstitutions = privateReversionSubstitutions,
        .reversionDeletions = privateReversionDeletions,
        .labeledSubstitutions = afterLabeling.labeledSubstitutions,
        .labeledDeletions = afterLabeling.labeledDeletions,
        .unlabeledSubstitutions = afterLabeling.unlabeledSubstitutions,
        .unlabeledDeletions = afterLabeling.unlabeledDeletions,
        .totalPrivateSubstitutions = totalPrivateSubstitutions,
        .totalPrivateDeletions = totalPrivateDeletions,
        .totalReversionSubstitutions = totalReversionSubstitutions,
        .totalReversionDeletions = totalReversionDeletions,
        .totalLabeledSubstitutions = totalLabeledSubstitutions,
        .totalLabeledDeletions = totalLabeledDeletions,
        .totalUnlabeledSubstitutions = totalUnlabeledSubstitutions,
        .totalUnlabeledDeletions = totalUnlabeledDeletions,
      };
    }

  }// namespace


  /**
   * Finds private nucleotide mutations. See the extended comment for a generic implementation above.
   */
  PrivateNucleotideMutations findPrivateNucMutations(                    //
    const std::map<int, Nucleotide>& nodeMutMap,                         //
    const AnalysisResult& seq,                                           //
    const NucleotideSequence& refSeq,                                    //
    const safe_vector<GenotypeLabeled<Nucleotide>>& substitutionLabelMap,//
    const safe_vector<GenotypeLabeled<Nucleotide>>& deletionLabelMap     //
  ) {
    return findPrivateMutations<Nucleotide>(nodeMutMap, seq, seq.substitutions, seq.deletions, refSeq,
      substitutionLabelMap, deletionLabelMap);
  }

  /** Returns predicate that allows to detect substitutions falling to the ranges of unknown aminoacids  */
  auto hasUnknownAaSubstitutions(const safe_vector<GeneAminoacidRange>& unknownAaRanges) {
    return [&unknownAaRanges](const AminoacidSubstitutionSimple& substitution) {
      return !isUnknownAa(substitution.pos, unknownAaRanges);
    };
  }

  /** Returns predicate that allows to detect deletions falling to the ranges of unknown aminoacids  */
  auto hasUnknownAaDeletions(const safe_vector<GeneAminoacidRange>& unknownAaRanges) {
    return [&unknownAaRanges](
             const AminoacidDeletionSimple& deletion) { return !isUnknownAa(deletion.pos, unknownAaRanges); };
  }

  /** Returns predicate that allows to detect labeled substitutions falling to the ranges of unknown aminoacids  */
  auto hasUnknownAaSubstitutionsLabeled(const safe_vector<GeneAminoacidRange>& unknownAaRanges) {
    return [&unknownAaRanges](const AminoacidSubstitutionSimpleLabeled& labeled) {
      return !isUnknownAa(labeled.substitution.pos, unknownAaRanges);
    };
  }

  /** Returns predicate that allows to detect labeled deletions falling to the ranges of unknown aminoacids  */
  auto hasUnknownAaDeletionsLabeled(const safe_vector<GeneAminoacidRange>& unknownAaRanges) {
    return [&unknownAaRanges](const AminoacidDeletionSimpleLabeled& labeled) {
      return !isUnknownAa(labeled.deletion.pos, unknownAaRanges);
    };
  }


  /**
   * Finds private aminoacid mutations. See the extended comment for the generic implementation above.
   */
  std::map<std::string, PrivateAminoacidMutations> findPrivateAaMutations(//
    const std::map<std::string, std::map<int, Aminoacid>>& nodeMutMap,    //
    const AnalysisResult& seq,                                            //
    const std::map<std::string, RefPeptideInternal>& refPeptides,         //
    const GeneMap& geneMap,                                               //
    const safe_vector<GenotypeLabeled<Aminoacid>>& substitutionLabelMap,  //
    const safe_vector<GenotypeLabeled<Aminoacid>>& deletionLabelMap       //
  ) {
    std::map<std::string, PrivateAminoacidMutations> result;

    // Aminoacid mutations are grouped by gene, and these groups should be handled independently
    for (const auto& geneMapEntry : geneMap) {
      const auto& geneName = geneMapEntry.first;

      // Only process amino acid mutations if the peptide is not missing (i.e. gene was properly translated and aligned)
      // In missing peptides all aminoacid mutations are also missing. We want to avoid treating these missing mutations
      // as reversions (Case 4). Detecting reversions makes sense under normal circumstances
      // when a single mutation is not present in a well-formed peptide, but not when all mutations are missing because
      // gene processing failed.
      if (has(seq.missingGenes, geneName)) {
        continue;
      }

      // Find out if node has mutations in this gene. If not, create an empty map. This way we can still account for
      // new amino acid mutations in sequence.
      auto nodeMutMapFound = nodeMutMap.find(geneName);
      auto nodeMutMapForGene = std::map<int, Aminoacid>{};
      if (nodeMutMapFound != nodeMutMap.end()) {
        nodeMutMapForGene = nodeMutMapFound->second;
      }

      // Reference peptide should always be there for all genes in the gene map. If it's not it's a bug.
      auto peptideFound = refPeptides.find(geneName);
      if (peptideFound == refPeptides.end()) {
        throw ErrorFindPrivateMutsRefPeptideNotFound(geneName);
      }
      const auto& refPeptide = peptideFound->second.peptide;

      // Filter out sequence substitutions which are only in this gene
      const auto aaSubstitutions =
        filter(seq.aaSubstitutions, [&geneName](const AminoacidSubstitution& aaSub) { return aaSub.gene == geneName; });

      // Filter out sequence deletions which are only in this gene
      const auto aaDeletions =
        filter(seq.aaDeletions, [&geneName](const AminoacidDeletion& aaDel) { return aaDel.gene == geneName; });

      const auto unknownAaRanges =
        filter(seq.unknownAaRanges, [&geneName](const GeneAminoacidRange& unk) { return unk.geneName == geneName; });

      auto found = findPrivateMutations<Aminoacid>(nodeMutMapForGene, seq, aaSubstitutions, aaDeletions, refPeptide,
        substitutionLabelMap, deletionLabelMap);

      // Filter out substitutions and deletions from results, where positions fall into ranges with
      // aminoacid X in query peptide.
      // In these cases the information is simply missing from the query and in the `processNodeMutations()` above
      // if a substitution or a deletion is missing from query, but present in the node, a reversion is added to the
      // results (a mutation from the node all the way to what was in the ref seq). We chose to remove these,
      // because we believe that a reversion is a less likely event and most of these are the sequencing errors
      // followed by uncertainty in translation.
      //
      // clang-format off
      found.privateSubstitutions = filter(found.privateSubstitutions, hasUnknownAaSubstitutions(unknownAaRanges));
      found.privateDeletions = filter(found.privateDeletions, hasUnknownAaDeletions(unknownAaRanges));
      found.reversionSubstitutions = filter(found.reversionSubstitutions, hasUnknownAaSubstitutions(unknownAaRanges));
      found.labeledSubstitutions = filter(found.labeledSubstitutions, hasUnknownAaSubstitutionsLabeled(unknownAaRanges));
      found.unlabeledSubstitutions = filter(found.unlabeledSubstitutions, hasUnknownAaSubstitutions(unknownAaRanges));
      found.reversionDeletions = filter(found.reversionDeletions, hasUnknownAaDeletions(unknownAaRanges));
      found.labeledDeletions = filter(found.labeledDeletions, hasUnknownAaDeletionsLabeled(unknownAaRanges));
      found.unlabeledDeletions = filter(found.unlabeledDeletions, hasUnknownAaDeletions(unknownAaRanges));
      // clang-format on

      result[geneName] = found;
    }

    return result;
  }

  ErrorFindPrivateMutsRefPeptideNotFound::ErrorFindPrivateMutsRefPeptideNotFound(const std::string& name)
      : ErrorNonFatal(fmt::format(
          "When searching for private aminoacid mutations: peptide \"{:s}\" was requested, but was not found among "
          "reference peptides. This is an internal issue. Please report this to developers, providing data and "
          "parameters you used, in order to replicate the error.",
          name)) {}
}// namespace Nextclade
