import produce, { current } from 'immer'
import { reducerWithInitialState } from 'typescript-fsa-reducers'

import type { QCResult } from 'src/algorithms/QC/runQC'

import immerCase from 'src/state/util/fsaImmerReducer'
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
  setHasErrorsFilter,
  setHasNoQcIssuesFilter,
  setHasQcIssuesFilter,
  setInput,
  setInputFile,
  setIsDirty,
  setMutationsFilter,
  setQcResults,
  setSeqNamesFilter,
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
      draft.qc = qc
    }
    return draft
  })

export const algorithmReducer = reducerWithInitialState(algorithmDefaultState)
  .withHandling(
    immerCase(resultsSortTrigger, (draft, sorting) => {
      draft.filters.sorting = sorting
      draft.results = sortResults(current(draft).results, sorting)
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setSeqNamesFilter, (draft, seqNamesFilter) => {
      draft.filters.seqNamesFilter = seqNamesFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setMutationsFilter, (draft, mutationsFilter) => {
      draft.filters.mutationsFilter = mutationsFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setAAFilter, (draft, aaFilter) => {
      draft.filters.aaFilter = aaFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setCladesFilter, (draft, cladesFilter) => {
      draft.filters.cladesFilter = cladesFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setHasNoQcIssuesFilter, (draft, hasNoQcIssuesFilter) => {
      draft.filters.hasNoQcIssuesFilter = hasNoQcIssuesFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setHasQcIssuesFilter, (draft, hasQcIssuesFilter) => {
      draft.filters.hasQcIssuesFilter = hasQcIssuesFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setHasErrorsFilter, (draft, hasErrorsFilter) => {
      draft.filters.hasErrorsFilter = hasErrorsFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setInput, (draft, input) => {
      draft.status = AlgorithmGlobalStatus.idling
      draft.params.input = input
    }),
  )

  .withHandling(
    immerCase(setInputFile, (draft, inputFile) => {
      draft.status = AlgorithmGlobalStatus.idling
      draft.inputFile = inputFile
    }),
  )

  .withHandling(
    immerCase(setIsDirty, (draft, isDirty) => {
      draft.status = AlgorithmGlobalStatus.idling
      draft.isDirty = isDirty
    }),
  )

  .withHandling(
    immerCase(algorithmRunAsync.started, (draft) => {
      draft.isDirty = false
      draft.results = []
      draft.resultsFiltered = []
    }),
  )

  .withHandling(
    immerCase(setAlgorithmGlobalStatus, (draft, status) => {
      draft.status = status
    }),
  )

  .withHandling(
    immerCase(algorithmRunAsync.done, (draft) => {
      draft.status = AlgorithmGlobalStatus.allDone
    }),
  )

  .withHandling(immerCase(algorithmRunAsync.failed, (draft, { params }) => {}))

  // parse
  .withHandling(immerCase(parseAsync.started, (draft) => {}))

  .withHandling(
    immerCase(parseAsync.done, (draft, { result }) => {
      draft.results = result.map((seqName, id) => ({
        status: AlgorithmSequenceStatus.idling,
        id,
        seqName,
        errors: [],
      }))

      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(parseAsync.failed, (draft, { error }) => {
      draft.errors.push(error.message)
    }),
  )

  // analyze
  .withHandling(
    immerCase(analyzeAsync.started, (draft, { seqName }) => {
      draft.results = draft.results.map((result) => {
        if (result.seqName === seqName) {
          return { ...result, status: AlgorithmSequenceStatus.analysisStarted }
        }
        return result
      })

      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(analyzeAsync.done, (draft, { params: { seqName }, result }) => {
      draft.results = draft.results.map((oldResult) => {
        if (oldResult.seqName === seqName) {
          return { ...oldResult, errors: [], result, status: AlgorithmSequenceStatus.analysisDone }
        }
        return oldResult
      })

      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(analyzeAsync.failed, (draft, { params: { seqName }, error }) => {
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
    }),
  )

  // Assign clades
  .withHandling(
    immerCase(setClades, (draft, clades) => {
      draft.results = mergeByWith(draft.results, clades, haveSameSeqName, mergeCladesIntoResults)
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  // QC
  .withHandling(
    immerCase(setQcResults, (draft, qcResults) => {
      draft.results = mergeByWith(draft.results, qcResults, haveSameSeqName, mergeQcIntoResults)
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )
