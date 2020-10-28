#include <set>

static const std::set<char> canonicalNucleotides = {'A', 'C', 'G', 'T'};// NOLINT(cert-err58-cpp)

template<typename T>
bool contains(const std::set<T>& s, const T& val) {
  return s.find(val) != s.end();
}


bool isCanonicalNucleotide(char nuc) {
  return contains(canonicalNucleotides, nuc);
}
