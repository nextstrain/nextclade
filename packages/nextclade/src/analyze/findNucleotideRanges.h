#pragma once

#include <nextalign/nextalign.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <functional>
#include <common/safe_vector.h>

namespace Nextclade {
  /**
  * Finds all contiguous ranges in a given sequence, fulfilling given boolean predicate.
  */
  safe_vector<NucleotideRange> findNucleotideRanges(const NucleotideSequence& str,
    const std::function<bool(const Nucleotide&)>& pred);

  /**
  * Finds all contiguous ranges of a given character in a given sequence.
  */
  safe_vector<NucleotideRange> findNucleotideRanges(const NucleotideSequence& str, Nucleotide nuc);


  /**
  * Finds all contiguous ranges of a given character in a given sequence.
  */
  safe_vector<AminoacidRange> findAminoacidRanges(const AminoacidSequence& str,
    const std::function<bool(const Aminoacid&)>& pred);

  /**
  * Finds all contiguous ranges of a given character in a given sequence.
  */
  safe_vector<AminoacidRange> findAminoacidRanges(const AminoacidSequence& str, Aminoacid aa);


  /**
  * Finds all contiguous ranges of a given character in all peptides, keeping them grouped per gene.
  */
  safe_vector<GeneAminoacidRange> findAminoacidRangesPerGene(//
    const safe_vector<PeptideInternal>& peptides,            //
    Aminoacid aa                                             //
  );

}// namespace Nextclade
