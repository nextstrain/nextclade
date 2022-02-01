#include <common/safe_vector.h>
#include <fmt/format.h>
#include <nextalign/nextalign.h>

#include <string>

std::string formatInsertionsCsvRow(const std::string& seqName, const safe_vector<NucleotideInsertion>& nucInsertions,
  const safe_vector<AminoacidInsertion>& aaInsertions, char delimiter /* = ';' */) {
  return fmt::format("\"{}\"{}\"{}\"{}\"{}\"\n", seqName, delimiter, formatInsertions(nucInsertions), delimiter,
    formatAaInsertions(aaInsertions));
}

std::string formatInsertionsCsvRow(const std::string& seqName, const safe_vector<NucleotideInsertion>& nucInsertions,
  const safe_vector<PeptideInternal>& queryPeptides, char delimiter /* = ';' */) {
  const auto aaInsertions = convertAaInsertions(queryPeptides);
  return formatInsertionsCsvRow(seqName, nucInsertions, aaInsertions, delimiter);
}
