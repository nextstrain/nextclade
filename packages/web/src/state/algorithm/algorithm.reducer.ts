import produce, { current } from 'immer'
import { getVirus } from 'src/algorithms/defaults/viruses'
import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import type { QCResult } from 'src/algorithms/QC/types'
import { mergeByWith } from 'src/helpers/mergeByWith'
import { sortResults } from 'src/helpers/sortResults'
import { runFilters } from 'src/filtering/runFilters'

import {
  algorithmRunAsync,
  analyzeAsync,
  setClades,
  parseAsync,
  resultsSortTrigger,
  setAAFilter,
  setAlgorithmGlobalStatus,
  setCladesFilter,
  setIsDirty,
  setMutationsFilter,
  setQcResults,
  setSeqNamesFilter,
  setShowGood,
  setShowErrors,
  setShowBad,
  setShowMediocre,
  setOutputTree,
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
} from './algorithm.actions'
import {
  algorithmDefaultState,
  AlgorithmGlobalStatus,
  AlgorithmSequenceStatus,
  CladeAssignmentResult,
  SequenceAnalysisState,
} from './algorithm.state'

const haveSameSeqName = (x: { seqName: string }, y: { seqName: string }) => x.seqName === y.seqName

const mergeCladesIntoResults = (result: SequenceAnalysisState, cladeResult: CladeAssignmentResult) =>
  produce(result, (draft) => {
    if (draft.result) {
      draft.result.clade = cladeResult.clade
    }
    return draft
  })

const mergeQcIntoResults = (result: SequenceAnalysisState, qc: QCResult) =>
  produce(result, (draft) => {
    if (draft.result) {
      draft.result.qc = qc
    }
    return draft
  })

export const algorithmReducer = reducerWithInitialState(algorithmDefaultState)
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

  .icase(setFasta.done, (draft, { result: seqData }) => {
    draft.params.seqData = seqData
  })

  .icase(setTree.done, (draft, { result: auspiceData }) => {
    draft.params.virus.auspiceData = auspiceData
  })

  .icase(setRootSeq.done, (draft, { result: rootSeq }) => {
    draft.params.virus.rootSeq = rootSeq
  })

  .icase(setQcSettings.done, (draft, { result: qcRulesConfig }) => {
    draft.params.virus.qcRulesConfig = qcRulesConfig
  })

  .icase(setGeneMap.done, (draft, { result: geneMap }) => {
    draft.params.virus.geneMap = geneMap
  })

  .icase(setPcrPrimers.done, (draft, { result: pcrPrimers }) => {
    draft.params.virus.pcrPrimers = pcrPrimers
  })

  .icase(removeFasta, (draft) => {
    draft.params.raw.seqData = undefined
  })

  .icase(removeTree, (draft) => {
    draft.params.raw.auspiceData = undefined
    draft.params.virus.auspiceData = getVirus(draft.params.virus.name).auspiceData
  })

  .icase(removeRootSeq, (draft) => {
    draft.params.raw.rootSeq = undefined
    draft.params.virus.rootSeq = getVirus(draft.params.virus.name).rootSeq
  })

  .icase(removeQcSettings, (draft) => {
    draft.params.raw.qcRulesConfig = undefined
    draft.params.virus.qcRulesConfig = getVirus(draft.params.virus.name).qcRulesConfig
  })

  .icase(removeGeneMap, (draft) => {
    draft.params.raw.geneMap = undefined
    draft.params.virus.geneMap = getVirus(draft.params.virus.name).geneMap
  })

  .icase(removePcrPrimers, (draft) => {
    draft.params.raw.pcrPrimers = undefined
    draft.params.virus.pcrPrimers = getVirus(draft.params.virus.name).pcrPrimers
  })

  .icase(setIsDirty, (draft, isDirty) => {
    draft.status = AlgorithmGlobalStatus.idling
    draft.isDirty = isDirty
  })

  .icase(algorithmRunAsync.started, (draft) => {
    draft.isDirty = false
    draft.results = []
    draft.resultsFiltered = []
  })

  .icase(setAlgorithmGlobalStatus, (draft, status) => {
    draft.status = status
  })

  .icase(algorithmRunAsync.done, (draft) => {
    draft.status = AlgorithmGlobalStatus.allDone
  })

  .icase(algorithmRunAsync.failed, (draft, { params }) => {})

  // parse
  .icase(parseAsync.started, (draft) => {})

  .icase(parseAsync.done, (draft, { result }) => {
    draft.results = result.map((seqName, id) => ({
      status: AlgorithmSequenceStatus.idling,
      id,
      seqName,
      errors: [],
    }))

    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(parseAsync.failed, (draft, { error }) => {
    draft.errors.push(error.message)
  })

  // analyze
  .icase(analyzeAsync.started, (draft, { seqName }) => {
    draft.results = draft.results.map((result) => {
      if (result.seqName === seqName) {
        return { ...result, status: AlgorithmSequenceStatus.analysisStarted }
      }
      return result
    })

    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(analyzeAsync.done, (draft, { params: { seqName }, result }) => {
    draft.results = draft.results.map((oldResult) => {
      if (oldResult.seqName === seqName) {
        return { ...oldResult, errors: [], result, status: AlgorithmSequenceStatus.analysisDone }
      }
      return oldResult
    })

    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(analyzeAsync.failed, (draft, { params: { seqName }, error }) => {
    draft.results = draft.results.map((oldResult) => {
      if (oldResult.seqName === seqName) {
        return {
          ...oldResult,
          errors: [error.message],
          result: undefined,
          status: AlgorithmSequenceStatus.analysisFailed,
        }
      }
      return oldResult
    })

    draft.resultsFiltered = runFilters(current(draft))
  })

  // Assign clades
  .icase(setClades, (draft, clades) => {
    draft.results = mergeByWith(draft.results, clades, haveSameSeqName, mergeCladesIntoResults)
    draft.resultsFiltered = runFilters(current(draft))
  })

  // QC
  .icase(setQcResults, (draft, qcResults) => {
    draft.results = mergeByWith(draft.results, qcResults, haveSameSeqName, mergeQcIntoResults)
    draft.resultsFiltered = runFilters(current(draft))
  })

  .icase(setOutputTree, (draft, auspiceData) => {
    draft.outputTree = auspiceData
  })
