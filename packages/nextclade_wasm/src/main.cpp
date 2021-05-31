//#include <emscripten.h>
#include <emscripten/bind.h>
#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <exception>
#include <utility>

#include "../../packages/nextclade/src/tree/treeAttachNodes.h"
#include "../../packages/nextclade/src/tree/treePostprocess.h"
#include "../../packages/nextclade/src/tree/treePreprocess.h"

std::string getExceptionMessage(std::intptr_t exceptionPtr) {// NOLINT(misc-unused-parameters)
  // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast,cppcoreguidelines-init-variables,performance-no-int-to-ptr)
  const std::exception* e = reinterpret_cast<std::runtime_error*>(exceptionPtr);
  return e->what();
}

struct NextcladeWasmState {
  NucleotideSequence ref;
  Nextclade::Tree tree;
  GeneMap geneMap;
  Nextclade::QcConfig qcRulesConfig;
  std::vector<Nextclade::PcrPrimer> pcrPrimers;
  std::vector<std::string> pcrPrimerWarnings;// TODO: report warnings
};

NextcladeWasmState makeNextcladeWasmState(//
  const std::string& refStr,              //
  const std::string& geneMapStr,          //
  const std::string& treeStr,             //
  const std::string& pcrPrimerRowsStr,    //
  const std::string& qcConfigStr          //
) {
  auto ref = toNucleotideSequence(refStr);

  Nextclade::Tree tree{treeStr};
  Nextclade::treePreprocess(tree, ref);

  auto geneMap = Nextclade::parseGeneMap(geneMapStr);
  auto qcRulesConfig = Nextclade::parseQcConfig(qcConfigStr);

  auto pcrPrimerRows = Nextclade::parsePcrPrimerCsvRowsStr(pcrPrimerRowsStr);
  std::vector<std::string> pcrPrimerWarnings;
  auto pcrPrimers = Nextclade::convertPcrPrimerRows(pcrPrimerRows, ref, pcrPrimerWarnings);

  return NextcladeWasmState{
    .ref = std::move(ref),
    .tree = std::move(tree),
    .geneMap = std::move(geneMap),
    .qcRulesConfig = qcRulesConfig,
    .pcrPrimers = std::move(pcrPrimers),
    .pcrPrimerWarnings = std::move(pcrPrimerWarnings),
  };
}

struct NextcladeWasmResult {
  std::string ref;
  std::string query;
  // std::vector<Peptide> refPeptides; // TODO: use these too
  // std::vector<Peptide> queryPeptides; // TODO: use these too
  // std::vector<std::string> warnings; // TODO: use these too
  std::string analysisResult;
  bool hasError;
  std::string error;
};

class NextcladeWasm {
  const NextcladeWasmState state;

public:
  NextcladeWasm(                          //
    const std::string& refStr,            //
    const std::string& geneMapStr,        //
    const std::string& geneMapName,       //
    const std::string& treeStr,           //
    const std::string& pcrPrimerRowsStr,  //
    const std::string& pcrPrimersFilename,//
    const std::string& qcConfigStr        //
    )
      : state(                   //
          makeNextcladeWasmState(//
            refStr,              //
            geneMapStr,          //
            treeStr,             //
            pcrPrimerRowsStr,    //
            qcConfigStr          //
            )                    //
          )                      //
  {}

  NextcladeWasmResult analyze(   //
    const std::string& queryName,//
    const std::string& queryStr  //
  ) {
    try {
      const auto query = toNucleotideSequence(queryStr);

      // FIXME: pass options from JS
      const auto nextalignOptions = getDefaultOptions();

      const auto result = analyzeOneSequence(//
        queryName,                           //
        state.ref,                           //
        query,                               //
        state.geneMap,                       //
        state.pcrPrimers,                    //
        state.qcRulesConfig,                 //
        state.tree,                          //
        nextalignOptions                     //
      );

      return NextcladeWasmResult{
        .ref = result.ref,
        .query = result.query,
        .analysisResult = serializeResultToString(result.analysisResult),
        .hasError = false,
        .error = {},
      };
    } catch (const ErrorNonFatal& e) {
      return NextcladeWasmResult{
        .ref = {},
        .query = {},
        .analysisResult = {},
        .hasError = true,
        .error = e.what(),
      };
    }
  }
};

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

std::string parseGeneMapGffString(const std::string& geneMapStr, const std::string& geneMapName) {
  std::stringstream geneMapStream{geneMapStr};
  auto geneMap = parseGeneMapGff(geneMapStream, geneMapName);
  return Nextclade::serializeGeneMap(geneMap);
}

std::string parseQcConfigString(const std::string& qcConfigStr) {
  Nextclade::QcConfig qcConfig = Nextclade::parseQcConfig(qcConfigStr);
  return Nextclade::serializeQcConfig(qcConfig);
}

std::string parsePcrPrimerCsvRowsStr(const std::string& pcrPrimersStr, const std::string& pcrPrimersFilename) {
  auto pcrPrimers = Nextclade::parsePcrPrimersCsv(pcrPrimersStr, pcrPrimersFilename);
  return Nextclade::serializePcrPrimerRowsToString(pcrPrimers);
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

std::string parseTree(const std::string& treeStr) {
  auto tree = Nextclade::Tree{treeStr};
  return tree.serialize(0);
}

std::string treePrepare(const std::string& treeStr, const std::string& refStr) {
  const auto ref = toNucleotideSequence(refStr);
  auto tree = Nextclade::Tree{treeStr};
  Nextclade::treePreprocess(tree, ref);
  return tree.serialize(0);
}

std::string treeFinalize(const std::string& treeStr, const std::string& refStr, const std::string& analysisResultsStr) {
  const auto ref = toNucleotideSequence(refStr);
  const auto analysisResults = Nextclade::parseAnalysisResults(analysisResultsStr);
  auto tree = Nextclade::Tree{treeStr};
  treeAttachNodes(tree, ref, analysisResults);
  treePostprocess(tree);
  return tree.serialize(0);
}

// NOLINTNEXTLINE(cert-err58-cpp,cppcoreguidelines-avoid-non-const-global-variables)
EMSCRIPTEN_BINDINGS(nextclade_wasm) {
  emscripten::function("getExceptionMessage", &getExceptionMessage);

  emscripten::function("parseGeneMapGffString", &parseGeneMapGffString);
  emscripten::function("parseQcConfigString", &parseQcConfigString);
  emscripten::function("parsePcrPrimerCsvRowsStr", &parsePcrPrimerCsvRowsStr);
  emscripten::function("parseTree", &parseTree);

  emscripten::value_object<AlgorithmInput>("AlgorithmInput")
    .field("index", &AlgorithmInput::index)
    .field("seqName", &AlgorithmInput::seqName)
    .field("seq", &AlgorithmInput::seq);


  emscripten::class_<NextcladeWasm>("NextcladeWasm")                                                         //
    .constructor<std::string, std::string, std::string, std::string, std::string, std::string, std::string>()//
    .function("analyze", &NextcladeWasm::analyze)                                                            //
    ;                                                                                                        //

  emscripten::value_object<NextcladeWasmResult>("NextcladeResultWasm")
    .field("ref", &NextcladeWasmResult::ref)
    .field("query", &NextcladeWasmResult::query)
    .field("analysisResult", &NextcladeWasmResult::analysisResult)
    .field("hasError", &NextcladeWasmResult::hasError)
    .field("error", &NextcladeWasmResult::error);

  emscripten::function("treePrepare", &treePrepare);
  emscripten::function("parseRefSequence", &parseRefSequence);
  emscripten::function("parseSequencesStreaming", &parseSequencesStreaming);
  emscripten::function("treeFinalize", &treeFinalize);
}
