import { DeepWritable } from 'ts-essentials'
import { current } from 'immer'
import { reducerWithInitialState } from 'typescript-fsa-reducers'

import { resultsSort } from 'src/helpers/resultsSort'

import { runFilters } from 'src/filtering/filtering'

import {
  algorithmRunAsync,
  analyzeAsync,
  parseAsync,
  resultsSortTrigger,
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
import { agorithmDefaultState, AlgorithmStatus, AnylysisStatus, SequenceAnylysisState } from './algorithm.state'

import immerCase from '../util/fsaImmerReducer'

export const agorithmReducer = reducerWithInitialState(agorithmDefaultState)
  .withHandling(
    immerCase(resultsSortTrigger, (draft, sorting) => {
      draft.sorting = sorting

      const results = resultsSort(current(draft).results, sorting)
      draft.results = results as DeepWritable<typeof results>

      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setSeqNamesFilter, (draft, seqNamesFilter) => {
      draft.seqNamesFilter = seqNamesFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setMutationsFilter, (draft, mutationsFilter) => {
      draft.mutationsFilter = mutationsFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setAAFilter, (draft, aaFilter) => {
      draft.aaFilter = aaFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setCladesFilter, (draft, cladesFilter) => {
      draft.cladesFilter = cladesFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setHasNoQcIssuesFilter, (draft, hasNoQcIssuesFilter) => {
      draft.hasNoQcIssuesFilter = hasNoQcIssuesFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setHasQcIssuesFilter, (draft, hasQcIssuesFilter) => {
      draft.hasQcIssuesFilter = hasQcIssuesFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setHasErrorsFilter, (draft, hasErrorsFilter) => {
      draft.hasErrorsFilter = hasErrorsFilter
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(setInput, (draft, input) => {
      draft.status = AlgorithmStatus.idling
      draft.params.input = input
    }),
  )

  .withHandling(
    immerCase(setInputFile, (draft, inputFile) => {
      draft.status = AlgorithmStatus.idling
      draft.inputFile = inputFile
    }),
  )

  .withHandling(
    immerCase(setIsDirty, (draft, isDirty) => {
      draft.status = AlgorithmStatus.idling
      draft.isDirty = isDirty
    }),
  )

  .withHandling(
    immerCase(algorithmRunAsync.started, (draft) => {
      draft.status = AlgorithmStatus.started
      draft.isDirty = false
      draft.results = []
      draft.resultsFiltered = []
    }),
  )

  .withHandling(
    immerCase(algorithmRunAsync.done, (draft) => {
      draft.status = AlgorithmStatus.done
    }),
  )

  .withHandling(immerCase(algorithmRunAsync.failed, (draft, { params }) => {}))

  // parse
  .withHandling(
    immerCase(parseAsync.started, (draft) => {
      draft.status = AlgorithmStatus.parsingStarted
    }),
  )

  .withHandling(
    immerCase(parseAsync.done, (draft, { result }) => {
      draft.status = AlgorithmStatus.parsingDone
      const resultState = result.map(
        (seqName, id) =>
          ({ status: AnylysisStatus.idling, id, seqName, errors: [] } as DeepWritable<SequenceAnylysisState>),
      )
      draft.results = resultState
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(parseAsync.failed, (draft, { error }) => {
      draft.status = AlgorithmStatus.parsingFailed
      draft.errors.push(error.message)
    }),
  )

  // analyze
  .withHandling(
    immerCase(analyzeAsync.started, (draft, { seqName }) => {
      draft.status = AlgorithmStatus.analysisStarted
      draft.results = draft.results.map((result) =>
        result.seqName === seqName ? { ...result, status: AnylysisStatus.started } : result,
      )
      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(analyzeAsync.done, (draft, { params: { seqName }, result }) => {
      draft.results = (draft.results.map((oldResult: DeepWritable<SequenceAnylysisState>) =>
        oldResult.seqName === seqName ? { ...oldResult, errors: [], result, status: AnylysisStatus.done } : oldResult,
      ) as unknown) as DeepWritable<SequenceAnylysisState>[]

      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

  .withHandling(
    immerCase(analyzeAsync.failed, (draft, { params: { seqName }, error }) => {
      draft.results = draft.results.map(handleFailure(seqName, error))

      draft.resultsFiltered = runFilters(current(draft))
    }),
  )

const handleFailure = (seqName: string, error: Error) => (
  oldResult: DeepWritable<SequenceAnylysisState>,
): DeepWritable<SequenceAnylysisState> => {
  if (oldResult.seqName === seqName) {
    return {
      ...oldResult,
      seqName,
      errors: [error.message],
      result: undefined,
      status: AnylysisStatus.failed,
    }
  }
  return oldResult
}
