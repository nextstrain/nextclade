#pragma once

#include <istream>
#include <map>
#include <memory>
#include <set>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

template<typename Letter>
using Sequence = std::basic_string<Letter>;

template<typename Letter>
using SequenceView = std::basic_string_view<Letter>;

enum class Nucleotide : char {
  U = 0,
  T = 1,
  A = 2,
  W = 3,
  C = 4,
  Y = 5,
  M = 6,
  H = 7,
  G = 8,
  K = 9,
  R = 10,
  D = 11,
  S = 12,
  B = 13,
  V = 14,
  N = 15,
  GAP = 16,
  SIZE = 17,
};

using NucleotideSequence = Sequence<Nucleotide>;

using NucleotideSequenceView = SequenceView<Nucleotide>;

NucleotideSequence toNucleotideSequence(const std::string& seq);

std::string toString(const NucleotideSequence& seq);


constexpr const char CHAR_AMINOACID_UNKNOWN = 'X';
constexpr const char CHAR_AMINOACID_GAP = '-';
constexpr const char CHAR_AMINOACID_STOP = '*';

enum class Aminoacid : char {
  A = 0,
  B = 1,// D | N
  C = 2,
  D = 3,
  E = 4,
  F = 5,
  G = 6,
  H = 7,
  I = 8,
  J = 9,// L | I
  K = 10,
  L = 11,
  M = 12,
  N = 13,
  O = 14,// (rare) Pyrrolysine
  P = 15,
  Q = 16,
  R = 17,
  S = 18,
  T = 19,
  U = 20,// (rare) Selenocysteine
  V = 21,
  W = 22,
  Y = 23,
  Z = 24,// E | Q
  X = 25,
  STOP = 26,
  GAP = 27,
  SIZE,
};

using AminoacidSequence = Sequence<Aminoacid>;

using AminoacidSequenceView = SequenceView<Aminoacid>;

AminoacidSequence toAminoacidSequence(const std::string& seq);

std::string toString(const AminoacidSequence& seq);


struct AlgorithmInput {
  int index;
  std::string seqName;
  std::string seq;
};


struct NextalignSeedOptions {
  int seedLength;
  int minSeeds;
  int seedSpacing;
  int mismatchesAllowed;
};

struct NextalignAlignmentOptions {
  int minimalLength;
  int penaltyGapExtend;
  int penaltyGapOpen;
  int penaltyGapOpenInFrame;
  int penaltyGapOpenOutOfFrame;
  int penaltyMismatch;
  int scoreMatch;
  int maxIndel;
};

struct NextalignOptions {
  NextalignAlignmentOptions alignment;
  NextalignSeedOptions seedNuc;
  NextalignSeedOptions seedAa;
};

struct Gene {
  std::string geneName;
  int start;
  int end;
  std::string strand;
  int frame;
  int length;
};


using GeneMap = std::map<std::string, Gene>;

struct Alignment {
  std::string query;
  int alignmentScore;
};

struct Peptide {
  std::string name;
  std::string seq;
};

template<typename Letter>
struct InsertionInternal {
  int pos;
  int length;
  Sequence<Letter> ins;
};

template<typename Letter>
inline bool operator==(const InsertionInternal<Letter>& lhs, const InsertionInternal<Letter>& rhs) {
  return lhs.pos == rhs.pos && lhs.ins == rhs.ins && lhs.length == rhs.length;
}

struct Insertion {
  int pos;
  int length;
  std::string ins;
};

struct NextalignResult {
  std::string ref;
  std::string query;
  int alignmentScore;
  std::vector<Peptide> refPeptides;
  std::vector<Peptide> queryPeptides;
  std::vector<Insertion> insertions;
  std::vector<std::string> warnings;
};

struct AlgorithmOutput {
  int index;
  std::string seqName;
  bool hasError;
  NextalignResult result;
  std::exception_ptr error;
};


NextalignResult nextalign(const NucleotideSequence& query, const NucleotideSequence& ref, const GeneMap& geneMap,
  const NextalignOptions& options);

NextalignOptions getDefaultOptions();

/**
 * Parses genemap in GFF format from a file or string stream
 *
 * @see GFF format reference at https://www.ensembl.org/info/website/upload/gff.html
 */
GeneMap parseGeneMapGff(std::istream& is, const std::string& name = "filestream");

class FastaStream {
public:
  FastaStream() = default;

  virtual ~FastaStream() = default;

  FastaStream(const FastaStream& other) = delete;

  FastaStream& operator=(const FastaStream& other) = delete;

  FastaStream(FastaStream&& other) = delete;

  FastaStream& operator=(const FastaStream&& other) = delete;

  /** Checks that the stream is in valid state and the next element can be retrieved from it */
  [[nodiscard]] virtual bool good() const = 0;

  /** Retrieves the next sequence in the stream */
  virtual AlgorithmInput next() = 0;
};

/** Creates an instance of fasta stream, given a file or string stream */
std::unique_ptr<FastaStream> makeFastaStream(std::istream& istream, std::string filename);

/** Parses all sequences of a given file or string stream */
std::vector<AlgorithmInput> parseSequences(std::istream& istream, std::string filename);

const char* getVersion();
