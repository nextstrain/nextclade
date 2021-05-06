//#include <emscripten.h>
#include <emscripten/bind.h>
#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <exception>

#include "../../packages/nextclade/src/tree/treeAttachNodes.h"
#include "../../packages/nextclade/src/tree/treePostprocess.h"
#include "../../packages/nextclade/src/tree/treePreprocess.h"

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


struct NextcladeResultWasm {
  std::string ref;
  std::string query;
  // std::vector<Peptide> refPeptides; // TODO: use these too
  // std::vector<Peptide> queryPeptides; // TODO: use these too
  // std::vector<std::string> warnings; // TODO: use these too
  std::string analysisResult;
};

NextcladeResultWasm runNextclade(  //
  int index,                       //
  const std::string& queryName,    //
  const std::string& queryStr,     //
  const std::string& refStr,       //
  const std::string& geneMapStr,   //
  const std::string& geneMapName,  //
  const std::string& treeStr,      //
  const std::string& pcrPrimersStr,//
  const std::string& qcConfigStr   //
) {
  const auto parsedRef = parseRefFastaFile(refStr);
  const auto& ref = parsedRef.seq;

  const auto& query = toNucleotideSequence(queryStr);

  auto tree = Nextclade::Tree{treeStr};

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
    .treeString = treeStr,
    .pcrPrimers = pcrPrimers,
    .geneMap = geneMap,
    .qcRulesConfig = qcRulesConfig,
    .nextalignOptions = nextalignOptions,
  };

  const auto result = analyzeOneSequence(//
    queryName,                           //
    ref,                                 //
    query,                               //
    geneMap,                             //
    pcrPrimers,                          //
    qcRulesConfig,                       //
    tree,                                //
    options                              //
  );

  return NextcladeResultWasm{
    .ref = result.ref,
    .query = result.query,
    .analysisResult = serializeResultToString(result.analysisResult),
  };
}


void parseSequencesStreaming(const std::string& queryFastaStr, emscripten::val onSequence, emscripten::val onComplete) {
  try {
    std::stringstream queryFastaStringstream{queryFastaStr};
    auto inputFastaStream = makeFastaStream(queryFastaStringstream);
    while (inputFastaStream->good()) {
      onSequence(inputFastaStream->next());
    }
    onComplete();
  } catch (...) {
  }
}

std::string treePrepare(const std::string& treeStr, const std::string& refStr) {
  const auto parsedRef = parseRefFastaFile(refStr);
  const auto& ref = parsedRef.seq;

  auto tree = Nextclade::Tree{treeStr};
  Nextclade::treePreprocess(tree, ref);
  return tree.serialize(0);
}

std::string treeFinalize(const std::string& treeStr, const std::string& refStr, const std::string& analysisResultsStr) {
  const auto parsedRef = parseRefFastaFile(refStr);
  const auto& ref = parsedRef.seq;

  // FIXME: get actual results
  std::vector<Nextclade::AnalysisResult> analysisResults;

  auto tree = Nextclade::Tree{treeStr};
  treeAttachNodes(tree, ref, analysisResults);
  treePostprocess(tree);
  return tree.serialize(0);
}


// NOLINTNEXTLINE(cert-err58-cpp,cppcoreguidelines-avoid-non-const-global-variables)
EMSCRIPTEN_BINDINGS(nextclade_wasm) {
  emscripten::function("getExceptionMessage", &getExceptionMessage);

  emscripten::value_object<AlgorithmInput>("AlgorithmInput")
    .field("index", &AlgorithmInput::index)
    .field("seqName", &AlgorithmInput::seqName)
    .field("seq", &AlgorithmInput::seq);

  emscripten::value_object<NextcladeResultWasm>("NextcladeResultWasm")
    .field("ref", &NextcladeResultWasm::ref)
    .field("query", &NextcladeResultWasm::query)
    .field("analysisResult", &NextcladeResultWasm::analysisResult);

  emscripten::function("treePrepare", &treePrepare);
  emscripten::function("parseSequencesStreaming", &parseSequencesStreaming);
  emscripten::function("runNextclade", &runNextclade);
  emscripten::function("treeFinalize", &treeFinalize);
}
