//#include <emscripten.h>
#include <emscripten/bind.h>
#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <exception>

#include "../../packages/nextclade/src/tree/treeAttachNodes.h"
#include "../../packages/nextclade/src/tree/treePostprocess.h"
#include "../../packages/nextclade/src/tree/treePreprocess.h"

std::string getExceptionMessage(std::intptr_t exceptionPtr) {// NOLINT(misc-unused-parameters)
  // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast,cppcoreguidelines-init-variables,performance-no-int-to-ptr)
  const std::exception* e = reinterpret_cast<std::runtime_error*>(exceptionPtr);
  return e->what();
}

struct NextcladeWasmResult {
  std::string ref;
  std::string query;
  // std::vector<Peptide> refPeptides; // TODO: use these too
  // std::vector<Peptide> queryPeptides; // TODO: use these too
  // std::vector<std::string> warnings; // TODO: use these too
  std::string analysisResult;
};

NextcladeWasmResult analyze(         //
  const std::string& queryName,      //
  const std::string& queryStr,       //
  const std::string& refStr,         //
  const std::string& geneMapStr,     //
  const std::string& geneMapName,    //
  const std::string& treePreparedStr,//
  const std::string& pcrPrimersStr,  //
  const std::string& qcConfigStr     //
) {

  const auto ref = toNucleotideSequence(refStr);
  const auto query = toNucleotideSequence(queryStr);

  auto tree = Nextclade::Tree{treePreparedStr};

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
    .treeString = treePreparedStr,
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

  return NextcladeWasmResult{
    .ref = result.ref,
    .query = result.query,
    .analysisResult = serializeResultToString(result.analysisResult),
  };
}

AlgorithmInput parseRefSequence(const std::string& refFastaStr) {
  std::stringstream refFastaStream{refFastaStr};
  const auto parsed = parseSequences(refFastaStream);

  if (parsed.size() != 1) {
    throw std::runtime_error(
      fmt::format("Error: {:d} sequences found in reference sequence file, expected 1", parsed.size()));
  }

  const auto& refSeq = parsed.front();
  return AlgorithmInput{.index = 0, .seqName = refSeq.seqName, .seq = refSeq.seq};
}

void parseSequencesStreaming(const std::string& queryFastaStr, const emscripten::val& onSequence,
  const emscripten::val& onComplete) {
  std::stringstream queryFastaStringstream{queryFastaStr};
  auto inputFastaStream = makeFastaStream(queryFastaStringstream);
  while (inputFastaStream->good()) {
    onSequence(inputFastaStream->next());
  }
  onComplete();
}

std::string treePrepare(const std::string& treeStr, const std::string& refStr) {
  const auto ref = toNucleotideSequence(refStr);
  auto tree = Nextclade::Tree{treeStr};
  Nextclade::treePreprocess(tree, ref);
  return tree.serialize(0);
}

std::string treeFinalize(const std::string& treeStr, const std::string& refStr, const std::string& analysisResultsStr) {
  const auto ref = toNucleotideSequence(refStr);

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

  //  emscripten::class_<NextcladeWasmParams>("NextcladeWasmParams")
  //    .constructor<>()
  //    .property("index", &NextcladeWasmParams::index)
  //    .property("queryName", &NextcladeWasmParams::queryName)
  //    .property("queryStr", &NextcladeWasmParams::queryStr)
  //    .property("refStr", &NextcladeWasmParams::refStr)
  //    .property("geneMapStr", &NextcladeWasmParams::geneMapStr)
  //    .property("geneMapName", &NextcladeWasmParams::geneMapName)
  //    .property("treeStr", &NextcladeWasmParams::treeStr)
  //    .property("pcrPrimersStr", &NextcladeWasmParams::pcrPrimersStr)
  //    .property("qcConfigStr", &NextcladeWasmParams::qcConfigStr);


  //  emscripten::value_object<NextcladeWasmParams>("NextcladeWasmParams")
  //    .field("index", &NextcladeWasmParams::index)
  //    .field("queryName", &NextcladeWasmParams::queryName)
  //    .field("queryStr", &NextcladeWasmParams::queryStr)
  //    .field("refStr", &NextcladeWasmParams::refStr)
  //    .field("geneMapStr", &NextcladeWasmParams::geneMapStr)
  //    .field("geneMapName", &NextcladeWasmParams::geneMapName)
  //    .field("treeStr", &NextcladeWasmParams::treeStr)
  //    .field("pcrPrimersStr", &NextcladeWasmParams::pcrPrimersStr)
  //    .field("qcConfigStr", &NextcladeWasmParams::qcConfigStr);

  emscripten::value_object<NextcladeWasmResult>("NextcladeResultWasm")
    .field("ref", &NextcladeWasmResult::ref)
    .field("query", &NextcladeWasmResult::query)
    .field("analysisResult", &NextcladeWasmResult::analysisResult);

  emscripten::function("treePrepare", &treePrepare);
  emscripten::function("parseRefSequence", &parseRefSequence);
  emscripten::function("parseSequencesStreaming", &parseSequencesStreaming);
  emscripten::function("analyze", &analyze);
  emscripten::function("treeFinalize", &treeFinalize);
}
