//#include <emscripten.h>
#include <emscripten/bind.h>
#include <fmt/format.h>
#include <nextclade/nextclade.h>
#include <nextclade/private/nextclade_private.h>

#include <exception>
#include <utility>

// FIXME: don't include private files from other packages
#include "../../nextclade/src/utils/concat.h"
#include "../../packages/nextclade/src/tree/treeAttachNodes.h"
#include "../../packages/nextclade/src/tree/treePostprocess.h"
#include "../../packages/nextclade/src/tree/treePreprocess.h"

std::string getExceptionMessage(std::intptr_t exceptionPtr) {// NOLINT(misc-unused-parameters)
  // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast,cppcoreguidelines-init-variables,performance-no-int-to-ptr)
  const std::exception* e = reinterpret_cast<std::runtime_error*>(exceptionPtr);
  return e->what();
}

/**
 * Wraps function into try/catch block to improve error message.
 * It is not possible to do this inside the function itself, because exception catching is disabled in that module.
 */
Nextclade::QcConfig wrappedParseQcConfig(const std::string& qcConfigStr, const std::string& context) {
  try {
    return Nextclade::parseQcConfig(qcConfigStr);
  } catch (const std::exception& e) {
    throw ErrorFatal(fmt::format("When parsing QC configuration in {:s}: {:s}", context, e.what()));
  }
}

/**
 * Wraps function into try/catch block to improve error message.
 * It is not possible to do this inside the function itself, because exception catching is disabled in that module.
 */
Nextclade::AnalysisResults wrappedParseAnalysisResults(const std::string& analysisResultsStr,
  const std::string& context) {
  try {
    return Nextclade::parseAnalysisResults(analysisResultsStr);
  } catch (const std::exception& e) {
    throw ErrorFatal(fmt::format("When parsing analysis results in {:s}: {:s}", context, e.what()));
  }
}


struct NextcladeWasmState {
  NextalignOptions nextalignOptions;
  NucleotideSequence ref;
  Nextclade::Tree tree;
  GeneMap geneMap;
  Nextclade::QcConfig qcRulesConfig;
  safe_vector<Nextclade::PcrPrimer> pcrPrimers;
  Warnings warnings;
  std::map<std::string, RefPeptideInternal> refPeptides;

  // FIXME: this contains duplicate content of `refPeptides`. Deduplicate and change the downstream code to use `refPeptides` if possible please.
  safe_vector<RefPeptideInternal> refPeptidesArr;
};

NextcladeWasmState makeNextcladeWasmState(//
  const std::string& refStr,              //
  const std::string& geneMapStr,          //
  const std::string& treeStr,             //
  const std::string& pcrPrimerRowsStr,    //
  const std::string& qcConfigStr          //
) {
  auto ref = toNucleotideSequence(refStr);

  auto geneMap = Nextclade::parseGeneMap(geneMapStr);
  auto qcRulesConfig = wrappedParseQcConfig(qcConfigStr, "'makeNextcladeWasmState'");
  auto pcrPrimerRows = Nextclade::parsePcrPrimerCsvRowsStr(pcrPrimerRowsStr);
  Warnings warnings;
  auto pcrPrimers = Nextclade::convertPcrPrimerRows(pcrPrimerRows, ref, warnings.global);

  // FIXME: pass options from JS
  auto nextalignOptions = getDefaultOptions();
  nextalignOptions.translatePastStop = true;

  auto refPeptides = translateGenesRef(ref, geneMap, nextalignOptions);
  auto refPeptidesArr = Nextclade::getRefPeptidesArray(refPeptides);

  Nextclade::Tree tree{treeStr};
  Nextclade::treePreprocess(tree, ref, refPeptides);

  return NextcladeWasmState{
    .nextalignOptions = nextalignOptions,
    .ref = std::move(ref),
    .tree = std::move(tree),
    .geneMap = std::move(geneMap),
    .qcRulesConfig = qcRulesConfig,
    .pcrPrimers = std::move(pcrPrimers),
    .warnings = std::move(warnings),
    .refPeptides = refPeptides,
    .refPeptidesArr = refPeptidesArr,
  };
}

struct NextcladeWasmResult {
  std::string ref;
  std::string query;
  std::string queryPeptides;
  std::string analysisResult;
  std::string warnings;
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

    Warnings warnings{
      .global = merge(state.warnings.global, warnings.global),
      .inGenes = merge(state.warnings.inGenes, warnings.inGenes),
    };

    try {
      const auto query = toNucleotideSequence(queryStr);


      const auto result = analyzeOneSequence(//
        queryName,                           //
        state.ref,                           //
        query,                               //
        state.refPeptides,                   //
        state.refPeptidesArr,                //
        state.geneMap,                       //
        state.pcrPrimers,                    //
        state.qcRulesConfig,                 //
        state.tree,                          //
        state.nextalignOptions,              //
        state.tree.getCladeNodeAttrKeys()    //
      );

      warnings.global = merge(warnings.global, result.warnings.global);
      warnings.inGenes = merge(warnings.inGenes, result.warnings.inGenes);

      return NextcladeWasmResult{
        .ref = result.ref,
        .query = result.query,
        .queryPeptides = Nextclade::serializePeptidesToString(result.queryPeptides),
        .analysisResult = serializeResultToString(result.analysisResult),
        .warnings = Nextclade::serializeWarningsToString(warnings),
        .hasError = false,
        .error = {},
      };
    } catch (const ErrorNonFatal& e) {
      return NextcladeWasmResult{
        .ref = {},
        .query = {},
        .queryPeptides = "",
        .analysisResult = {},
        .warnings = Nextclade::serializeWarningsToString(warnings),
        .hasError = true,
        .error = e.what(),
      };
    }
  }

  std::string getTree() const {
    return state.tree.serialize(0);
  }

  std::string getCladeNodeAttrKeysStr() const {
    return Nextclade::serializeCladeNodeAttrKeys(state.tree.getCladeNodeAttrKeys());
  }
};

AlgorithmInput parseRefSequence(const std::string& refFastaStr, const std::string& refFastaName) {
  std::stringstream refFastaStream{refFastaStr};
  const auto parsed = parseSequencesSlow(refFastaStream, refFastaName);

  if (parsed.size() != 1) {
    throw std::runtime_error(fmt::format("Error: {:d} sequences found in reference sequence file ('{:s}'), expected 1",
      parsed.size(), refFastaName));
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
  auto qcConfig = wrappedParseQcConfig(qcConfigStr, "'parseQcConfigString'");
  return Nextclade::serializeQcConfig(qcConfig);
}

std::string parsePcrPrimerCsvRowsStr(const std::string& pcrPrimersStr, const std::string& pcrPrimersFilename) {
  auto pcrPrimers = Nextclade::parsePcrPrimersCsv(pcrPrimersStr, pcrPrimersFilename);
  return Nextclade::serializePcrPrimerRowsToString(pcrPrimers);
}

void parseSequencesStreaming(const std::string& queryFastaStr, const std::string& queryFastaName,
  const emscripten::val& onSequence, const emscripten::val& onComplete) {
  std::stringstream queryFastaStringstream{queryFastaStr};
  auto inputFastaStream = makeFastaStreamSlow(queryFastaStringstream, queryFastaName);
  AlgorithmInput input;
  while (inputFastaStream->next(input)) {
    onSequence(std::move(input));
  }
  onComplete();
}

std::string parseTree(const std::string& treeStr) {
  auto tree = Nextclade::Tree{treeStr};
  return tree.serialize(0);
}

std::string treeFinalize(const std::string& treeStr, const std::string& refStr, const std::string& analysisResultsStr) {
  const auto ref = toNucleotideSequence(refStr);
  const auto analysisResults = wrappedParseAnalysisResults(analysisResultsStr, "'treeFinalize'");
  auto tree = Nextclade::Tree{treeStr};
  treeAttachNodes(tree, analysisResults.results);
  treePostprocess(tree);
  return tree.serialize(0);
}

std::string serializeToCsv(const std::string& analysisResultsStr, const std::string& delimiter) {
  const auto analysisResults = wrappedParseAnalysisResults(analysisResultsStr, "'serializeToCsv'");
  std::stringstream outputCsvStream;
  auto csv = Nextclade::createCsvWriter(Nextclade::CsvWriterOptions{.delimiter = delimiter[0]},
    analysisResults.cladeNodeAttrKeys);
  for (const auto& result : analysisResults.results) {
    csv->addRow(result);
  }
  csv->write(outputCsvStream);
  return outputCsvStream.str();
}

std::string serializeInsertionsToCsv(const std::string& analysisResultsStr) {
  const auto analysisResults = wrappedParseAnalysisResults(analysisResultsStr, "'serializeInsertionsToCsv'");
  std::stringstream outputInsertionsStream;
  outputInsertionsStream << "seqName,insertions\n";
  for (const auto& result : analysisResults.results) {
    const auto& seqName = result.seqName;
    const auto& insertions = result.insertions;
    outputInsertionsStream << fmt::format("\"{:s}\",\"{:s}\"\n", seqName, formatInsertions(insertions));
  }
  return outputInsertionsStream.str();
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

  emscripten::value_object<Peptide>("Peptide")//
    .field("name", &Peptide::name)            //
    .field("seq", &Peptide::seq)              //
    ;                                         //

  emscripten::class_<NextcladeWasm>("NextcladeWasm")                                                         //
    .constructor<std::string, std::string, std::string, std::string, std::string, std::string, std::string>()//
    .function("analyze", &NextcladeWasm::analyze)                                                            //
    .function("getTree", &NextcladeWasm::getTree)                                                            //
    .function("getCladeNodeAttrKeysStr", &NextcladeWasm::getCladeNodeAttrKeysStr);                           //

  emscripten::value_object<NextcladeWasmResult>("NextcladeResultWasm")
    .field("ref", &NextcladeWasmResult::ref)
    .field("query", &NextcladeWasmResult::query)
    .field("queryPeptides", &NextcladeWasmResult::queryPeptides)
    .field("analysisResult", &NextcladeWasmResult::analysisResult)
    .field("warnings", &NextcladeWasmResult::warnings)
    .field("hasError", &NextcladeWasmResult::hasError)
    .field("error", &NextcladeWasmResult::error);

  emscripten::function("parseRefSequence", &parseRefSequence);
  emscripten::function("parseSequencesStreaming", &parseSequencesStreaming);
  emscripten::function("treeFinalize", &treeFinalize);

  emscripten::function("serializeToCsv", &serializeToCsv);
  emscripten::function("serializeInsertionsToCsv", &serializeInsertionsToCsv);
}
