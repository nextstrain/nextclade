#include <common/safe_vector.h>
#include <nextalign/nextalign.h>


safe_vector<AminoacidInsertion> convertAaInsertions(const safe_vector<PeptideInternal>& peptides) {
  safe_vector<AminoacidInsertion> result;
  for (const auto& peptide : peptides) {
    for (const auto& insertion : peptide.insertions) {
      result.emplace_back(AminoacidInsertion{
        .gene = peptide.name,
        .pos = insertion.pos,
        .length = insertion.length,
        .ins = insertion.ins,
      });
    }
  }
  return result;
}
