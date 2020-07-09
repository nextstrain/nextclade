import { DeepNullable, DeepWritable } from 'ts-essentials'

import { intersectionWith, intersection } from 'lodash'
import { current } from 'immer'
import { reducerWithInitialState } from 'typescript-fsa-reducers'

import type { AnalysisResult, NucleotideSubstitution } from 'src/algorithms/types'
import { parseMutation } from 'src/helpers/parseMutation'
import { notUndefined } from 'src/helpers/notUndefined'

import {
  algorithmRunAsync,
  analyzeAsync,
  parseAsync,
  setCladesFilter,
  setInput,
  setInputFile,
  setIsDirty,
  setMutationsFilter,
} from './algorithm.actions'
import { agorithmDefaultState, AlgorithmStatus, AnylysisStatus, SequenceAnylysisState } from './algorithm.state'

import immerCase from '../util/fsaImmerReducer'

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

    const clades = Object.keys(result.result.clades)
    return intersectionWith(cladesFilters, clades, (filter, clade) => clade.startsWith(filter)).length > 0
  }
}

export interface RunFiltersParams {
  resultsCurrent: SequenceAnylysisState[]
  mutationsFilter?: string
  cladesFilter?: string
}

export function runFilters({ resultsCurrent, mutationsFilter, cladesFilter }: RunFiltersParams) {
  let filtered = resultsCurrent
  if (mutationsFilter) {
    filtered = filtered.filter(getMutationsFilterRunner(mutationsFilter))
  }
  if (cladesFilter) {
    filtered = filtered.filter(getCladesFilterRunner(cladesFilter))
  }
  return filtered as DeepWritable<typeof filtered>
}

export const agorithmReducer = reducerWithInitialState(agorithmDefaultState)
  .withHandling(
    immerCase(setMutationsFilter, (draft, mutationsFilter) => {
      draft.mutationsFilter = mutationsFilter

      const resultsCurrent = current(draft).results
      const { cladesFilter } = draft
      const resultsFiltered = runFilters({ resultsCurrent, mutationsFilter, cladesFilter })
      draft.resultsFiltered = resultsFiltered
    }),
  )

  .withHandling(
    immerCase(setCladesFilter, (draft, cladesFilter) => {
      draft.cladesFilter = cladesFilter
      if (cladesFilter) {
        draft.resultsFiltered = current(draft).results.filter(getCladesFilterRunner(cladesFilter))
      } else {
        draft.resultsFiltered = draft.results
      }
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
      const resultState = result.map((seqName) => ({ status: AnylysisStatus.idling, seqName, errors: [] }))
      draft.results = resultState
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
    }),
  )

  .withHandling(
    immerCase(analyzeAsync.done, (draft, { params: { seqName }, result }) => {
      draft.results = (draft.results.map((oldResult: DeepWritable<SequenceAnylysisState>) =>
        oldResult.seqName === seqName ? { ...oldResult, errors: [], result, status: AnylysisStatus.done } : oldResult,
      ) as unknown) as DeepWritable<SequenceAnylysisState>[]
    }),
  )

  .withHandling(
    immerCase(analyzeAsync.failed, (draft, { params: { seqName }, error }) => {
      draft.results = draft.results.map(handleFailure(seqName, error))
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
