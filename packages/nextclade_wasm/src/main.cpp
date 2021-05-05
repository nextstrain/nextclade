#include <emscripten.h>
#include <emscripten/bind.h>
#include <fmt/format.h>
#include <nextclade/nextclade.h>

#include <exception>

class ErrorFastaReader : public std::runtime_error {
public:
  explicit ErrorFastaReader(const std::string& message) : std::runtime_error(message) {}
};

struct ReferenceSequenceData {
  const NucleotideSequence seq;
  const std::string name;
  const int length;
};

ReferenceSequenceData parseRefFastaFile(const std::string& fastaStr) {
  std::stringstream fastaStream{fastaStr};

  const auto refSeqs = parseSequences(fastaStream);
  if (refSeqs.size() != 1) {
    throw ErrorFastaReader(
      fmt::format("Error: {:d} sequences found in reference sequence file, expected 1", refSeqs.size()));
  }

  const auto& refSeq = refSeqs.front();
  const auto& seq = toNucleotideSequence(refSeq.seq);
  const auto length = static_cast<int>(seq.size());
  return {.seq = seq, .name = refSeq.seqName, .length = length};
}


std::string getExceptionMessage(std::intptr_t exceptionPtr) {// NOLINT(misc-unused-parameters)
  // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast,cppcoreguidelines-init-variables,performance-no-int-to-ptr)
  const std::exception* e = reinterpret_cast<std::runtime_error*>(exceptionPtr);
  return e->what();
}

std::string runNextclade(          //
  int index,                       //
  const std::string& queryStr,     //
  const std::string& refStr,       //
  const std::string& geneMapStr,   //
  const std::string& geneMapName,  //
  const std::string& treeString,   //
  const std::string& pcrPrimersStr,//
  const std::string& qcConfigStr   //
) {
  const auto parsedRef = parseRefFastaFile(refStr);
  const auto parsedQuery = parseRefFastaFile(queryStr);

  const auto& ref = parsedRef.seq;
  const auto& query = parsedQuery.seq;

  std::stringstream geneMapStream{geneMapStr};
  const auto geneMap = parseGeneMapGff(geneMapStream, geneMapName);

  // FIXME: parse PCR primers
  // auto pcrPrimers = convertPcrPrimers(pcrPrimersStr);
  std::vector<Nextclade::PcrPrimer> pcrPrimers;

  Nextclade::QcConfig qcRulesConfig = Nextclade::parseQcConfig(qcConfigStr);

  // FIXME: pass options from JS
  const auto nextalignOptions = getDefaultOptions();

  const Nextclade::NextcladeOptions options = {
    .ref = ref,
    .treeString = treeString,
    .pcrPrimers = pcrPrimers,
    .geneMap = geneMap,
    .qcRulesConfig = qcRulesConfig,
    .nextalignOptions = nextalignOptions,
  };

  Nextclade::NextcladeAlgorithm nextclade{options};
  const auto result = nextclade.run(parsedQuery.name, query);

  std::vector<Nextclade::AnalysisResult> analysisResults;
  analysisResults.push_back(result.analysisResult);

  const auto& tree = nextclade.finalize(analysisResults);
  auto treeStr = tree.serialize();

  auto resultStr = serializeResults(analysisResults);

  return resultStr;
}

// NOLINTNEXTLINE(cert-err58-cpp,cppcoreguidelines-avoid-non-const-global-variables)
EMSCRIPTEN_BINDINGS(nextclade_wasm) {
  emscripten::function("getExceptionMessage", &getExceptionMessage);
  emscripten::function("runNextclade", &runNextclade);
}
