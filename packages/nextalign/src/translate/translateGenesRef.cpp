#include "translateGenesRef.h"

#include <common/contract.h>
#include "../utils/safe_cast.h"
#include "decode.h"
#include "translate.h"

template<typename IntS, typename IntL>
inline NucleotideSequence substr(const NucleotideSequence& s, IntS start, IntL length) noexcept(false) {
  invariant_greater_equal(start, 0);
  invariant_less(start, s.size());
  invariant_greater_equal(length, 0);
  invariant_less_equal(start + length, s.size());
  return s.substr(safe_cast<size_t>(start), safe_cast<size_t>(length));
}

std::map<std::string, RefPeptideInternal> translateGenesRef(//
  const NucleotideSequence& ref,                            //
  const GeneMap& geneMap,                                   //
  const NextalignOptions& options                           //
) {
  std::map<std::string, RefPeptideInternal> result;
  for (const auto& [geneName, _] : geneMap) {
    const auto& found = geneMap.find(geneName);
    if (found == geneMap.end()) {
      continue;
    }

    const auto& gene = found->second;
    const auto length = gene.end - gene.start;
    auto nucSeq = substr(ref, gene.start, length);
    if (gene.strand == "-") {
      reverseComplementInPlace(nucSeq);
    }
    auto peptide = translate(nucSeq, options.translatePastStop);

    result.emplace(gene.geneName, RefPeptideInternal{.geneName = gene.geneName, .peptide = peptide});
  }

  return result;
}//namespace Nextclade
