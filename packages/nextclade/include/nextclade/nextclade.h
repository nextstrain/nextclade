#pragma once

#include <nextalign/nextalign.h>

#include <map>

#include "private/__generated__/types.h"

namespace Nextclade {
  struct NucleotideSubstitution;

  using AuspiceJsonV2 = Generated::AuspiceJsonV2Json;
  using AuspiceJsonV2TreeNode = Generated::Tree;
  using AuspiceJsonV2TreeNodeBranchAttrs = Generated::BranchAttrs;
  using AuspiceJsonV2TreeNodeNodeAttrs = Generated::NodeAttrs;

  using MutationMap = std::map<int, Nucleotide>;

  struct AuspiceJsonV2TreeNodeExtended : public AuspiceJsonV2TreeNode {
    int id;
    MutationMap mutations;
    MutationMap substitutions;
    // std::shared_ptr<std::vector<AuspiceJsonV2TreeNodeExtended>> children;
  };

  struct PcrPrimer {};

  struct QcConfig {};

  struct NextcladeOptions : public NextalignOptions {
    QcConfig qcRulesConfig;
    int minimalLength;
  };

  struct NextcladeParams {
    std::string seqName;
    NucleotideSequence query;
    NucleotideSequence ref;
    std::vector<PcrPrimer> pcrPrimers;
    GeneMap geneMap;
    AuspiceJsonV2 auspiceData;
    NextcladeOptions options;
  };

  struct NucleotideSubstitution {
    int pos;
    Nucleotide refNuc;
    Nucleotide queryNuc;
  };

  struct NucleotideDeletion {
    int start;
    int length;
  };

  struct NucleotideInsertion {
    int pos;
    int length;
    NucleotideSequence ins;
  };

  struct NucleotideRange {
    int begin;
    int end;
    int length;
    Nucleotide nuc;
  };

  struct AnalysisResult {
    std::vector<NucleotideSubstitution> substitutions;
    std::vector<NucleotideDeletion> deletions;
    std::vector<NucleotideInsertion> insertions;
    int alignmentStart;
    int alignmentEnd;
  };

  struct NextcladeResultIntermediate {
    std::string seqName;
    std::vector<NucleotideSubstitution> substitutions;
    int totalSubstitutions;
    std::vector<NucleotideDeletion> deletions;
    int totalDeletions;
    std::vector<NucleotideInsertion> insertions;
    int totalInsertions;
    std::vector<NucleotideRange> missing;
    int totalMissing;
    std::vector<NucleotideRange> nonACGTNs;
    int totalNonACGTNs;
    int alignmentStart;
    int alignmentEnd;
    int alignmentScore;
  };

  struct NextcladeResult : public NextcladeResultIntermediate {};

  NextcladeResult nextclade(const NextcladeParams& params);
}// namespace Nextclade
