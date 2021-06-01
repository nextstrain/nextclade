import { current } from 'immer'
import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import type { Gene } from 'src/algorithms/types'
import { sortResults } from 'src/helpers/sortResults'
import { runFilters } from 'src/filtering/runFilters'

import {
  algorithmRunAsync,
  resultsSortTrigger,
  setAAFilter,
  setAlgorithmGlobalStatus,
  setCladesFilter,
  setIsDirty,
  setMutationsFilter,
  setSeqNamesFilter,
  setShowGood,
  setShowErrors,
  setShowBad,
  setShowMediocre,
  setTreeResult,
  setFasta,
  setTree,
  setGeneMap,
  setQcSettings,
  setRootSeq,
  setPcrPrimers,
  removeGeneMap,
  removePcrPrimers,
  removeFasta,
  removeTree,
  removeQcSettings,
  removeRootSeq,
  addParsedSequence,
  addNextcladeResult,
} from './algorithm.actions'
import {
  algorithmDefaultState,
  AlgorithmGlobalStatus,
  AlgorithmParams,
  AlgorithmSequenceStatus,
  ResultsFilters,
  SequenceAnalysisState,
} from './algorithm.state'

export const algorithmReducer = reducerWithInitialState(algorithmDefaultState)
  .icase(addParsedSequence, (draft, { index, seqName }) => {
    draft.results[index] = {
      status: AlgorithmSequenceStatus.queued,
      id: index,
      seqName,
      result: undefined,
      query: undefined,
      queryPeptides: undefined,
      errors: [],
    }
    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(addNextcladeResult, (draft, { nextcladeResult }) => {
    draft.results[nextcladeResult.index].result = nextcladeResult.analysisResult
    draft.results[nextcladeResult.index].query = nextcladeResult.query
    draft.results[nextcladeResult.index].queryPeptides = nextcladeResult.queryPeptides

    if (nextcladeResult.hasError) {
      draft.results[nextcladeResult.index].status = AlgorithmSequenceStatus.failed
      draft.results[nextcladeResult.index].errors = [nextcladeResult.error]
    } else {
      draft.results[nextcladeResult.index].status = AlgorithmSequenceStatus.done
      draft.results[nextcladeResult.index].errors = []
    }

    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(resultsSortTrigger, (draft, sorting) => {
    draft.filters.sorting = sorting
    draft.results = sortResults(current(draft).results, sorting)
    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(setSeqNamesFilter, (draft, seqNamesFilter) => {
    draft.filters.seqNamesFilter = seqNamesFilter
    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(setMutationsFilter, (draft, mutationsFilter) => {
    draft.filters.mutationsFilter = mutationsFilter
    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(setAAFilter, (draft, aaFilter) => {
    draft.filters.aaFilter = aaFilter
    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(setCladesFilter, (draft, cladesFilter) => {
    draft.filters.cladesFilter = cladesFilter
    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(setShowGood, (draft, showGood) => {
    draft.filters.showGood = showGood
    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(setShowMediocre, (draft, showMediocre) => {
    draft.filters.showMediocre = showMediocre
    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(setShowBad, (draft, showBad) => {
    draft.filters.showBad = showBad
    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(setShowErrors, (draft, showErrors) => {
    draft.filters.showErrors = showErrors
    draft.resultsFiltered = runFilters(current(draft))
  })

  // ******************

  .icase(setFasta.started, (draft, input) => {
    draft.params.raw.seqData = input
    draft.params.strings.queryStr = undefined
    draft.params.errors.seqData = []
  })

  .icase(setTree.started, (draft, input) => {
    draft.params.raw.auspiceData = input
    draft.params.strings.treeStr = undefined
    draft.params.errors.auspiceData = []
  })

  .icase(setRootSeq.started, (draft, input) => {
    draft.params.raw.rootSeq = input
    draft.params.strings.refStr = undefined
    draft.params.final.genomeSize = undefined
    draft.params.errors.rootSeq = []
  })

  .icase(setQcSettings.started, (draft, input) => {
    draft.params.raw.qcConfig = input
    draft.params.strings.qcConfigStr = undefined
    draft.params.errors.qcConfig = []
  })

  .icase(setGeneMap.started, (draft, input) => {
    draft.params.raw.geneMap = input
    draft.params.strings.geneMapStr = undefined
    draft.params.final.geneMap = undefined
    draft.params.errors.geneMap = []
  })

  .icase(setPcrPrimers.started, (draft, input) => {
    draft.params.raw.pcrPrimers = input
    draft.params.strings.pcrPrimerCsvRowsStr = undefined
    draft.params.errors.pcrPrimers = []
  })

  // ******************

  .icase(setFasta.done, (draft, { result: { queryStr } }) => {
    draft.params.strings.queryStr = queryStr
    draft.params.errors.seqData = []
  })

  .icase(setTree.done, (draft, { result: { treeStr } }) => {
    draft.params.strings.treeStr = treeStr
    draft.params.errors.auspiceData = []
  })

  .icase(setRootSeq.done, (draft, { result: { refStr } }) => {
    draft.params.strings.refStr = refStr
    draft.params.final.genomeSize = refStr.length
    draft.params.errors.rootSeq = []
  })

  .icase(setQcSettings.done, (draft, { result: { qcConfigStr } }) => {
    draft.params.strings.qcConfigStr = qcConfigStr
    draft.params.errors.qcConfig = []
  })

  .icase(setGeneMap.done, (draft, { result: { geneMapStr } }) => {
    const geneMap = JSON.parse(geneMapStr) as Gene[]
    draft.params.strings.geneMapStr = geneMapStr
    draft.params.final.geneMap = geneMap
    draft.params.errors.geneMap = []
  })

  .icase(setPcrPrimers.done, (draft, { result: { pcrPrimerCsvRowsStr } }) => {
    draft.params.strings.pcrPrimerCsvRowsStr = pcrPrimerCsvRowsStr
    draft.params.errors.pcrPrimers = []
  })

  // ******************

  .icase(setFasta.failed, (draft, { error }) => {
    draft.params.strings.queryStr = undefined
    draft.params.errors.seqData = [error]
  })

  .icase(setTree.failed, (draft, { error }) => {
    draft.params.strings.treeStr = undefined
    draft.params.errors.auspiceData = [error]
  })

  .icase(setRootSeq.failed, (draft, { error }) => {
    draft.params.strings.refStr = undefined
    draft.params.final.genomeSize = undefined
    draft.params.errors.rootSeq = [error]
  })

  .icase(setQcSettings.failed, (draft, { error }) => {
    draft.params.strings.qcConfigStr = undefined
    draft.params.errors.qcConfig = [error]
  })

  .icase(setGeneMap.failed, (draft, { error }) => {
    draft.params.strings.pcrPrimerCsvRowsStr = undefined
    draft.params.final.geneMap = undefined
    draft.params.errors.geneMap = [error]
  })

  .icase(setPcrPrimers.failed, (draft, { error }) => {
    draft.params.strings.pcrPrimerCsvRowsStr = undefined
    draft.params.errors.pcrPrimers = [error]
  })

  // ******************

  .icase(removeFasta, (draft) => {
    draft.params.raw.seqData = undefined
    draft.params.errors.seqData = []
    draft.params.seqData = undefined
  })

  .icase(removeTree, (draft) => {
    draft.params.raw.auspiceData = undefined
    draft.params.errors.auspiceData = []
  })

  .icase(removeRootSeq, (draft) => {
    draft.params.raw.rootSeq = undefined
    draft.params.errors.rootSeq = []
  })

  .icase(removeQcSettings, (draft) => {
    draft.params.raw.qcConfig = undefined
    draft.params.errors.qcConfig = []
  })

  .icase(removeGeneMap, (draft) => {
    draft.params.raw.geneMap = undefined
    draft.params.errors.geneMap = []
  })

  .icase(removePcrPrimers, (draft) => {
    draft.params.raw.pcrPrimers = undefined
    draft.params.errors.pcrPrimers = []
  })

  // ******************

  .icase(setIsDirty, (draft, isDirty) => {
    draft.status = AlgorithmGlobalStatus.idle
    draft.isDirty = isDirty
  })

  .icase(algorithmRunAsync.started, (draft) => {
    draft.status = AlgorithmGlobalStatus.idle
    draft.isDirty = false
    draft.results = []
    draft.resultsFiltered = []
    draft.treeStr = undefined
    draft.errors = []
  })

  .icase(setAlgorithmGlobalStatus, (draft, status) => {
    draft.status = status
  })

  .icase(algorithmRunAsync.trigger, (draft) => {
    draft.status = AlgorithmGlobalStatus.idle
    draft.errors = []
  })

  .icase(algorithmRunAsync.done, (draft) => {
    draft.status = AlgorithmGlobalStatus.done
    draft.errors = []
  })

  .icase(algorithmRunAsync.failed, (draft, { params, error }) => {
    draft.status = AlgorithmGlobalStatus.failed
    draft.errors = [error.message]
  })

  // ******************

  .icase(setTreeResult, (draft, { treeStr }) => {
    draft.treeStr = treeStr
  })
