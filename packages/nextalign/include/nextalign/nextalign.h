#pragma once

#include <istream>
#include <map>
#include <memory>
#include <set>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>


/**
 * Catching exceptions in WebAssembly requires enabling it in Emscripten
 * explicitly and leads to a significant performance penalty. In order to
 * avoid that, we use status codes in the portion of the code
 * which was previously throwing and catching exceptions.
 */
enum class Status : int {
  Success = 0,
  Error = 1,
};

struct GeneWarning {
  std::string geneName;
  std::string message;
};

struct Warnings {
  std::vector<std::string> global;
  std::vector<GeneWarning> inGenes;
};

struct Range {
  int begin;
  int end;

  [[nodiscard]] bool contains(int x) const {
    return x >= begin && x < end;
  }
};

[[nodiscard]] inline Range nucRangeToCodonRange(const Range& range) {
  return Range{
    .begin = range.begin / 3,
    // Make sure the right boundary is aligned to codon boundary
    .end = (range.end + (3 - range.end % 3) % 3) / 3,
  };
}

[[nodiscard]] inline bool operator==(const Range& left, const Range& right) {
  return left.begin == right.begin && left.end == right.end;
}

[[nodiscard]] inline bool operator!=(const Range& left, const Range& right) {
  return left.begin != right.begin && left.end != right.end;
}

[[nodiscard]] inline Range operator+(const Range& r, int add) {
  return Range{.begin = r.begin + add, .end = r.end + add};
}

[[nodiscard]] inline Range operator-(const Range& r, int sub) {
  return Range{.begin = r.begin - sub, .end = r.end - sub};
}

[[nodiscard]] inline Range operator*(const Range& r, int mul) {
  return Range{.begin = r.begin * mul, .end = r.end * mul};
}

[[nodiscard]] inline Range operator/(const Range& r, int div) {
  return Range{.begin = r.begin / div, .end = r.end / div};
}

struct FrameShiftContext {
  Range codon;
};

inline bool operator==(const FrameShiftContext& left, const FrameShiftContext& right) {
  return left.codon == right.codon//
    ;
}

struct FrameShiftResult {
  std::string geneName;
  Range nucRel;
  Range nucAbs;
  Range codon;
  FrameShiftContext gapsLeading;
  FrameShiftContext gapsTrailing;
};

inline bool operator==(const FrameShiftResult& left, const FrameShiftResult& right) {
  return left.geneName == right.geneName           //
         && left.nucRel == right.nucRel            //
         && left.nucAbs == right.nucAbs            //
         && left.codon == right.codon              //
         && left.gapsLeading == right.gapsLeading  //
         && left.gapsTrailing == right.gapsTrailing//
    ;
}

struct InternalFrameShiftResultWithMask {
  FrameShiftResult frameShift;
  Range codonMask;// used internally during translation to mask undesired regions around the frame shift
};

inline bool operator==(const InternalFrameShiftResultWithMask& left, const InternalFrameShiftResultWithMask& right) {
  return left.frameShift == right.frameShift //
         && left.codonMask == right.codonMask//
    ;
}

class Error : public std::runtime_error {
public:
  explicit Error(const std::string& message) : std::runtime_error(message) {}
};

class ErrorFatal : public Error {
public:
  explicit ErrorFatal(const std::string& message) : Error(message) {}
};

class ErrorNonFatal : public Error {
public:
  explicit ErrorNonFatal(const std::string& message) : Error(message) {}
};


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
  bool translatePastStop;
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
  std::vector<FrameShiftResult> frameShiftResults;
};

struct RefPeptide {
  std::string name;
  std::string seq;
};

struct RefPeptideInternal {
  std::string geneName;
  AminoacidSequence peptide;
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
  std::vector<Peptide> queryPeptides;
  std::vector<Insertion> insertions;
  Warnings warnings;
};

struct AlgorithmOutput {
  int index;
  std::string seqName;
  bool hasError;
  NextalignResult result;
  std::exception_ptr error;
};

std::map<std::string, RefPeptideInternal> translateGenesRef(//
  const NucleotideSequence& ref,                            //
  const GeneMap& geneMap,                                   //
  const NextalignOptions& options                           //
);

NextalignResult nextalign(const NucleotideSequence& query, const NucleotideSequence& ref,
  const std::map<std::string, RefPeptideInternal>& refPeptides, const GeneMap& geneMap,
  const NextalignOptions& options);

NextalignOptions getDefaultOptions();

/**
 * Parses genemap in GFF format from a file or string stream
 *
 * @see GFF format reference at https://www.ensembl.org/info/website/upload/gff.html
 */
GeneMap parseGeneMapGff(std::istream& is, const std::string& name = "filestream");

template<typename Letter>
bool isGap(Letter nuc) {
  return nuc == Letter::GAP;
}

inline bool isUnknown(const Nucleotide& nuc) {
  return nuc == Nucleotide::N;
}

inline bool isUnknown(const Aminoacid& aa) {
  return aa == Aminoacid::N;
}

class FastaStream {
public:
  FastaStream() = default;

  virtual ~FastaStream() = default;

  FastaStream(const FastaStream& other) = delete;

  FastaStream& operator=(const FastaStream& other) = delete;

  FastaStream(FastaStream&& other) = delete;

  FastaStream& operator=(const FastaStream&& other) = delete;

  /** Retrieves the next sequence in the stream. Returns `false` if there are no more sequences */
  virtual bool next(AlgorithmInput& input) = 0;
};

/** Creates an instance of fasta stream, given a file or string stream */
std::unique_ptr<FastaStream> makeFastaStream(const std::string& filename);

/** Parses all sequences of a given file or string stream */
std::vector<AlgorithmInput> parseSequences(const std::string& filename);

const char* getVersion();
