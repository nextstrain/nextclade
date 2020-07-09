import { DeepWritable } from 'ts-essentials'

import { intersectionWith } from 'lodash'
import { current } from 'immer'
import { reducerWithInitialState } from 'typescript-fsa-reducers'

import type { NucleotideSubstitution } from 'src/algorithms/types'
import { parseMutation } from 'src/helpers/parseMutation'
import { notUndefined } from 'src/helpers/notUndefined'
import { formatClades } from 'src/helpers/formatClades'

import {
  algorithmRunAsync,
  analyzeAsync,
  parseAsync,
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
import {
  agorithmDefaultState,
  AlgorithmState,
  AlgorithmStatus,
  AnylysisStatus,
  SequenceAnylysisState,
} from './algorithm.state'

import immerCase from '../util/fsaImmerReducer'

export function getSeqNamesFilterRunner(seqNamesFilter: string) {
  const seqNamesFilters = seqNamesFilter.split(',')
  return (result: SequenceAnylysisState) => {
    return seqNamesFilters.some((filter) => result.seqName.includes(filter))
  }
}

export function mutationsAreEqual(filter: Partial<NucleotideSubstitution>, actual: NucleotideSubstitution) {
  const posMatch = filter.pos === undefined || filter.pos === actual.pos
  const refNucMatch = filter.refNuc === undefined || filter.refNuc === actual.refNuc
  const queryNucMatch = filter.queryNuc === undefined || filter.queryNuc === actual.queryNuc
  return posMatch && refNucMatch && queryNucMatch
}

export function getMutationsFilterRunner(mutationsFilter: string) {
  const mutationFilters = mutationsFilter.split(',').map(parseMutation).filter(notUndefined)

  return (result: SequenceAnylysisState) => {
    if (!result?.result) {
      return false
    }
    const mutations = result.result.substitutions
    return intersectionWith(mutationFilters, mutations, mutationsAreEqual).length > 0
  }
}

export function getCladesFilterRunner(cladesFilter: string) {
  const cladesFilters = cladesFilter.split(',')

  return (result: SequenceAnylysisState) => {
    if (!result?.result) {
      return false
    }

    const { cladeStr } = formatClades(result.result.clades)
    return cladesFilters.some((filter) => cladeStr.startsWith(filter))
  }
}

export function runFilters(state: AlgorithmState) {
  const {
    results,
    seqNamesFilter,
    mutationsFilter,
    cladesFilter,
    hasQcIssuesFilter,
    hasNoQcIssuesFilter,
    hasErrorsFilter,
  } = state

  let filtered = results
  if (seqNamesFilter) {
    filtered = filtered.filter(getSeqNamesFilterRunner(seqNamesFilter))
  }

  if (mutationsFilter) {
    filtered = filtered.filter(getMutationsFilterRunner(mutationsFilter))
  }

  if (cladesFilter) {
    filtered = filtered.filter(getCladesFilterRunner(cladesFilter))
  }

  if (!hasNoQcIssuesFilter) {
    filtered = filtered.filter(({ result }) => !(result && result.diagnostics.flags.length === 0))
  }

  if (!hasQcIssuesFilter) {
    filtered = filtered.filter(
      ({ result, errors }) => !(errors.length > 0 || (result && result.diagnostics.flags.length > 0)),
    )
  }

  if (!hasErrorsFilter) {
    filtered = filtered.filter(({ errors }) => errors.length === 0)
  }

  return filtered as DeepWritable<typeof filtered>
}

export const agorithmReducer = reducerWithInitialState(agorithmDefaultState)
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
