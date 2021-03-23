#pragma once

#include <nextalign/nextalign.h>

#include <gsl/string_span>
#include <vector>

template<typename Letter>
using SequenceSpan = gsl::basic_string_span<Letter, gsl::dynamic_extent>;


template<typename Letter>
struct InsertionInternal {
  int begin;
  int end;
  Sequence<Letter> seq;
};

struct PeptideInternal {
  std::string name;
  AminoacidSequence seq;
  std::vector<InsertionInternal<Aminoacid>> insertions;
};


struct NextalignResultInternal {
  NucleotideSequence query;
  NucleotideSequence ref;
  int alignmentScore;
  std::vector<PeptideInternal> refPeptides;
  std::vector<PeptideInternal> queryPeptides;
  std::vector<InsertionInternal<Nucleotide>> insertions;
  std::vector<std::string> warnings;
};

std::vector<Insertion> toInsertionsExternal(const std::vector<InsertionInternal<Nucleotide>>& insertions);

std::vector<Peptide> toPeptidesExternal(const std::vector<PeptideInternal>& peptides);

NextalignResultInternal nextalignInternal(const NucleotideSequence& query, const NucleotideSequence& ref,
  const GeneMap& geneMap, const NextalignOptions& options);
