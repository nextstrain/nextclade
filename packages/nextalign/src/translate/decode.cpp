#include "decode.h"

#include <fmt/format.h>
#include <frozen/map.h>
#include <frozen/set.h>
#include <frozen/string.h>

#include "utils/contract.h"


using NucleotideSequenceFrozen = frozen::basic_string<Nucleotide>;


constexpr const Nucleotide GAP_GAP_GAP[3] = {Nucleotide::GAP, Nucleotide::GAP, Nucleotide::GAP};
constexpr const Nucleotide AAA[3] = {Nucleotide::A, Nucleotide::A, Nucleotide::A};
constexpr const Nucleotide AAC[3] = {Nucleotide::A, Nucleotide::A, Nucleotide::C};
constexpr const Nucleotide AAG[3] = {Nucleotide::A, Nucleotide::A, Nucleotide::G};
constexpr const Nucleotide AAT[3] = {Nucleotide::A, Nucleotide::A, Nucleotide::T};
constexpr const Nucleotide ACA[3] = {Nucleotide::A, Nucleotide::C, Nucleotide::A};
constexpr const Nucleotide ACC[3] = {Nucleotide::A, Nucleotide::C, Nucleotide::C};
constexpr const Nucleotide ACG[3] = {Nucleotide::A, Nucleotide::C, Nucleotide::G};
constexpr const Nucleotide ACT[3] = {Nucleotide::A, Nucleotide::C, Nucleotide::T};
constexpr const Nucleotide AGA[3] = {Nucleotide::A, Nucleotide::G, Nucleotide::A};
constexpr const Nucleotide AGC[3] = {Nucleotide::A, Nucleotide::G, Nucleotide::C};
constexpr const Nucleotide AGG[3] = {Nucleotide::A, Nucleotide::G, Nucleotide::G};
constexpr const Nucleotide AGT[3] = {Nucleotide::A, Nucleotide::G, Nucleotide::T};
constexpr const Nucleotide ATA[3] = {Nucleotide::A, Nucleotide::T, Nucleotide::A};
constexpr const Nucleotide ATC[3] = {Nucleotide::A, Nucleotide::T, Nucleotide::C};
constexpr const Nucleotide ATG[3] = {Nucleotide::A, Nucleotide::T, Nucleotide::G};
constexpr const Nucleotide ATT[3] = {Nucleotide::A, Nucleotide::T, Nucleotide::T};
constexpr const Nucleotide CAA[3] = {Nucleotide::C, Nucleotide::A, Nucleotide::A};
constexpr const Nucleotide CAC[3] = {Nucleotide::C, Nucleotide::A, Nucleotide::C};
constexpr const Nucleotide CAG[3] = {Nucleotide::C, Nucleotide::A, Nucleotide::G};
constexpr const Nucleotide CAT[3] = {Nucleotide::C, Nucleotide::A, Nucleotide::T};
constexpr const Nucleotide CCA[3] = {Nucleotide::C, Nucleotide::C, Nucleotide::A};
constexpr const Nucleotide CCC[3] = {Nucleotide::C, Nucleotide::C, Nucleotide::C};
constexpr const Nucleotide CCG[3] = {Nucleotide::C, Nucleotide::C, Nucleotide::G};
constexpr const Nucleotide CCT[3] = {Nucleotide::C, Nucleotide::C, Nucleotide::T};
constexpr const Nucleotide CGA[3] = {Nucleotide::C, Nucleotide::G, Nucleotide::A};
constexpr const Nucleotide CGC[3] = {Nucleotide::C, Nucleotide::G, Nucleotide::C};
constexpr const Nucleotide CGG[3] = {Nucleotide::C, Nucleotide::G, Nucleotide::G};
constexpr const Nucleotide CGT[3] = {Nucleotide::C, Nucleotide::G, Nucleotide::T};
constexpr const Nucleotide CTA[3] = {Nucleotide::C, Nucleotide::T, Nucleotide::A};
constexpr const Nucleotide CTC[3] = {Nucleotide::C, Nucleotide::T, Nucleotide::C};
constexpr const Nucleotide CTG[3] = {Nucleotide::C, Nucleotide::T, Nucleotide::G};
constexpr const Nucleotide CTT[3] = {Nucleotide::C, Nucleotide::T, Nucleotide::T};
constexpr const Nucleotide GAA[3] = {Nucleotide::G, Nucleotide::A, Nucleotide::A};
constexpr const Nucleotide GAC[3] = {Nucleotide::G, Nucleotide::A, Nucleotide::C};
constexpr const Nucleotide GAG[3] = {Nucleotide::G, Nucleotide::A, Nucleotide::G};
constexpr const Nucleotide GAT[3] = {Nucleotide::G, Nucleotide::A, Nucleotide::T};
constexpr const Nucleotide GCA[3] = {Nucleotide::G, Nucleotide::C, Nucleotide::A};
constexpr const Nucleotide GCC[3] = {Nucleotide::G, Nucleotide::C, Nucleotide::C};
constexpr const Nucleotide GCG[3] = {Nucleotide::G, Nucleotide::C, Nucleotide::G};
constexpr const Nucleotide GCT[3] = {Nucleotide::G, Nucleotide::C, Nucleotide::T};
constexpr const Nucleotide GGA[3] = {Nucleotide::G, Nucleotide::G, Nucleotide::A};
constexpr const Nucleotide GGC[3] = {Nucleotide::G, Nucleotide::G, Nucleotide::C};
constexpr const Nucleotide GGG[3] = {Nucleotide::G, Nucleotide::G, Nucleotide::G};
constexpr const Nucleotide GGT[3] = {Nucleotide::G, Nucleotide::G, Nucleotide::T};
constexpr const Nucleotide GTA[3] = {Nucleotide::G, Nucleotide::T, Nucleotide::A};
constexpr const Nucleotide GTC[3] = {Nucleotide::G, Nucleotide::T, Nucleotide::C};
constexpr const Nucleotide GTG[3] = {Nucleotide::G, Nucleotide::T, Nucleotide::G};
constexpr const Nucleotide GTT[3] = {Nucleotide::G, Nucleotide::T, Nucleotide::T};
constexpr const Nucleotide TAA[3] = {Nucleotide::T, Nucleotide::A, Nucleotide::A};
constexpr const Nucleotide TAC[3] = {Nucleotide::T, Nucleotide::A, Nucleotide::C};
constexpr const Nucleotide TAG[3] = {Nucleotide::T, Nucleotide::A, Nucleotide::G};
constexpr const Nucleotide TAT[3] = {Nucleotide::T, Nucleotide::A, Nucleotide::T};
constexpr const Nucleotide TCA[3] = {Nucleotide::T, Nucleotide::C, Nucleotide::A};
constexpr const Nucleotide TCC[3] = {Nucleotide::T, Nucleotide::C, Nucleotide::C};
constexpr const Nucleotide TCG[3] = {Nucleotide::T, Nucleotide::C, Nucleotide::G};
constexpr const Nucleotide TCT[3] = {Nucleotide::T, Nucleotide::C, Nucleotide::T};
constexpr const Nucleotide TGA[3] = {Nucleotide::T, Nucleotide::G, Nucleotide::A};
constexpr const Nucleotide TGC[3] = {Nucleotide::T, Nucleotide::G, Nucleotide::C};
constexpr const Nucleotide TGG[3] = {Nucleotide::T, Nucleotide::G, Nucleotide::G};
constexpr const Nucleotide TGT[3] = {Nucleotide::T, Nucleotide::G, Nucleotide::T};
constexpr const Nucleotide TTA[3] = {Nucleotide::T, Nucleotide::T, Nucleotide::A};
constexpr const Nucleotide TTC[3] = {Nucleotide::T, Nucleotide::T, Nucleotide::C};
constexpr const Nucleotide TTG[3] = {Nucleotide::T, Nucleotide::T, Nucleotide::G};
constexpr const Nucleotide TTT[3] = {Nucleotide::T, Nucleotide::T, Nucleotide::T};


static constexpr const frozen::map<NucleotideSequenceFrozen, Aminoacid, 65> codonTable = {
  {NucleotideSequenceFrozen{GAP_GAP_GAP, 3}, Aminoacid::GAP},
  {NucleotideSequenceFrozen{AAA, 3}, Aminoacid::K},
  {NucleotideSequenceFrozen{AAC, 3}, Aminoacid::N},
  {NucleotideSequenceFrozen{AAG, 3}, Aminoacid::K},
  {NucleotideSequenceFrozen{AAT, 3}, Aminoacid::N},
  {NucleotideSequenceFrozen{ACA, 3}, Aminoacid::T},
  {NucleotideSequenceFrozen{ACC, 3}, Aminoacid::T},
  {NucleotideSequenceFrozen{ACG, 3}, Aminoacid::T},
  {NucleotideSequenceFrozen{ACT, 3}, Aminoacid::T},
  {NucleotideSequenceFrozen{AGA, 3}, Aminoacid::R},
  {NucleotideSequenceFrozen{AGC, 3}, Aminoacid::S},
  {NucleotideSequenceFrozen{AGG, 3}, Aminoacid::R},
  {NucleotideSequenceFrozen{AGT, 3}, Aminoacid::S},
  {NucleotideSequenceFrozen{ATA, 3}, Aminoacid::I},
  {NucleotideSequenceFrozen{ATC, 3}, Aminoacid::I},
  {NucleotideSequenceFrozen{ATG, 3}, Aminoacid::M},
  {NucleotideSequenceFrozen{ATT, 3}, Aminoacid::I},
  {NucleotideSequenceFrozen{CAA, 3}, Aminoacid::Q},
  {NucleotideSequenceFrozen{CAC, 3}, Aminoacid::H},
  {NucleotideSequenceFrozen{CAG, 3}, Aminoacid::Q},
  {NucleotideSequenceFrozen{CAT, 3}, Aminoacid::H},
  {NucleotideSequenceFrozen{CCA, 3}, Aminoacid::P},
  {NucleotideSequenceFrozen{CCC, 3}, Aminoacid::P},
  {NucleotideSequenceFrozen{CCG, 3}, Aminoacid::P},
  {NucleotideSequenceFrozen{CCT, 3}, Aminoacid::P},
  {NucleotideSequenceFrozen{CGA, 3}, Aminoacid::R},
  {NucleotideSequenceFrozen{CGC, 3}, Aminoacid::R},
  {NucleotideSequenceFrozen{CGG, 3}, Aminoacid::R},
  {NucleotideSequenceFrozen{CGT, 3}, Aminoacid::R},
  {NucleotideSequenceFrozen{CTA, 3}, Aminoacid::L},
  {NucleotideSequenceFrozen{CTC, 3}, Aminoacid::L},
  {NucleotideSequenceFrozen{CTG, 3}, Aminoacid::L},
  {NucleotideSequenceFrozen{CTT, 3}, Aminoacid::L},
  {NucleotideSequenceFrozen{GAA, 3}, Aminoacid::E},
  {NucleotideSequenceFrozen{GAC, 3}, Aminoacid::D},
  {NucleotideSequenceFrozen{GAG, 3}, Aminoacid::E},
  {NucleotideSequenceFrozen{GAT, 3}, Aminoacid::D},
  {NucleotideSequenceFrozen{GCA, 3}, Aminoacid::A},
  {NucleotideSequenceFrozen{GCC, 3}, Aminoacid::A},
  {NucleotideSequenceFrozen{GCG, 3}, Aminoacid::A},
  {NucleotideSequenceFrozen{GCT, 3}, Aminoacid::A},
  {NucleotideSequenceFrozen{GGA, 3}, Aminoacid::G},
  {NucleotideSequenceFrozen{GGC, 3}, Aminoacid::G},
  {NucleotideSequenceFrozen{GGG, 3}, Aminoacid::G},
  {NucleotideSequenceFrozen{GGT, 3}, Aminoacid::G},
  {NucleotideSequenceFrozen{GTA, 3}, Aminoacid::V},
  {NucleotideSequenceFrozen{GTC, 3}, Aminoacid::V},
  {NucleotideSequenceFrozen{GTG, 3}, Aminoacid::V},
  {NucleotideSequenceFrozen{GTT, 3}, Aminoacid::V},
  {NucleotideSequenceFrozen{TAA, 3}, Aminoacid::STOP},
  {NucleotideSequenceFrozen{TAC, 3}, Aminoacid::Y},
  {NucleotideSequenceFrozen{TAG, 3}, Aminoacid::STOP},
  {NucleotideSequenceFrozen{TAT, 3}, Aminoacid::Y},
  {NucleotideSequenceFrozen{TCA, 3}, Aminoacid::S},
  {NucleotideSequenceFrozen{TCC, 3}, Aminoacid::S},
  {NucleotideSequenceFrozen{TCG, 3}, Aminoacid::S},
  {NucleotideSequenceFrozen{TCT, 3}, Aminoacid::S},
  {NucleotideSequenceFrozen{TGA, 3}, Aminoacid::STOP},
  {NucleotideSequenceFrozen{TGC, 3}, Aminoacid::C},
  {NucleotideSequenceFrozen{TGG, 3}, Aminoacid::W},
  {NucleotideSequenceFrozen{TGT, 3}, Aminoacid::C},
  {NucleotideSequenceFrozen{TTA, 3}, Aminoacid::L},
  {NucleotideSequenceFrozen{TTC, 3}, Aminoacid::F},
  {NucleotideSequenceFrozen{TTG, 3}, Aminoacid::L},
  {NucleotideSequenceFrozen{TTT, 3}, Aminoacid::F},
};

Aminoacid decode(const NucleotideSequenceView& codon) {
  invariant_equal(3, codon.size());

  const auto it = codonTable.find(codon);
  if (it != codonTable.end()) {
    return it->second;
  }

  return Aminoacid::X;
}
