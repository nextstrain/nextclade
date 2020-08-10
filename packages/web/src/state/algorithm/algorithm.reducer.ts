import { current } from 'immer'
import { reducerWithInitialState } from 'typescript-fsa-reducers'

import immerCase from 'src/state/util/fsaImmerReducer'
import { sortResults } from 'src/helpers/sortResults'
import { runFilters } from 'src/filtering/runFilters'

import {
  algorithmRunAsync,
  analyzeAsync,
  parseAsync,
  resultsSortTrigger,
  runQcAsync,
  setAAFilter,
  setCladesFilter,
  setHasErrorsFilter,
  setHasNoQcIssuesFilter,
  setHasQcIssuesFilter,
  setInput,
  setInputFile,
  setIsDirty,
  setMutationsFilter,
  setSeqNamesFilter,
} from './algorithm.actions'
import { algorithmDefaultState, AlgorithmGlobalStatus, AlgorithmSequenceStatus } from './algorithm.state'

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
      draft.status = AlgorithmGlobalStatus.started
      draft.isDirty = false
      draft.results = []
      draft.resultsFiltered = []
    }),
  )

  .withHandling(
    immerCase(algorithmRunAsync.done, (draft) => {
      draft.status = AlgorithmGlobalStatus.allDone
    }),
  )

  .withHandling(immerCase(algorithmRunAsync.failed, (draft, { params }) => {}))

  // parse
  .withHandling(
    immerCase(parseAsync.started, (draft) => {
      draft.status = AlgorithmGlobalStatus.parsingStarted
    }),
  )

  .withHandling(
    immerCase(parseAsync.done, (draft, { result }) => {
      draft.status = AlgorithmGlobalStatus.parsingDone
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
      draft.status = AlgorithmGlobalStatus.parsingFailed
      draft.errors.push(error.message)
    }),
  )

  // analyze
  .withHandling(
    immerCase(analyzeAsync.started, (draft, { seqName }) => {
      draft.status = AlgorithmGlobalStatus.analysisStarted
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
      draft.status = AlgorithmGlobalStatus.analysisDone
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
      draft.status = AlgorithmGlobalStatus.analysisFailed
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

  // runQc
  .withHandling(
    immerCase(runQcAsync.started, (draft, { seqName }) => {
      draft.status = AlgorithmGlobalStatus.qcStarted
      draft.qcResults = draft.qcResults.map((result) => {
        if (result.seqName === seqName) {
          return { ...result, status: AlgorithmSequenceStatus.qcStarted }
        }
        return result
      })
    }),
  )

  .withHandling(
    immerCase(runQcAsync.done, (draft, { params: { seqName }, result }) => {
      draft.status = AlgorithmGlobalStatus.qcDone
      draft.qcResults = draft.qcResults.map((oldResult) => {
        if (oldResult.seqName === seqName) {
          return { ...oldResult, errors: [], result, status: AlgorithmSequenceStatus.qcDone }
        }
        return oldResult
      })
    }),
  )

  .withHandling(
    immerCase(runQcAsync.failed, (draft, { params: { seqName }, error }) => {
      draft.status = AlgorithmGlobalStatus.qcFailed
      draft.qcResults = draft.qcResults.map((oldResult) => {
        if (oldResult.seqName === seqName) {
          return {
            ...oldResult,
            errors: [error.message],
            status: AlgorithmSequenceStatus.qcFailed,
          }
        }
        return oldResult
      })
    }),
  )
