import { reducerWithInitialState } from 'typescript-fsa-reducers'

import { algorithmRunAsync, analyzeAsync, parseAsync, setInput, setInputFile, setIsDirty } from './algorithm.actions'
import { agorithmDefaultState, AlgorithmStatus, AnylysisStatus } from './algorithm.state'

import immerCase from '../util/fsaImmerReducer'

export const agorithmReducer = reducerWithInitialState(agorithmDefaultState)
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

  .withHandling(
    immerCase(algorithmRunAsync.failed, (draft) => {
      draft.status = AlgorithmStatus.failed
    }),
  )

  // parse
  .withHandling(
    immerCase(parseAsync.started, (draft) => {
      draft.status = AlgorithmStatus.parsingStarted
    }),
  )

  .withHandling(
    immerCase(parseAsync.done, (draft, { result }) => {
      draft.status = AlgorithmStatus.parsingDone
      const resultState = result.map((seqName) => ({ status: AnylysisStatus.idling, seqName }))
      draft.results = resultState
    }),
  )

  .withHandling(
    immerCase(parseAsync.failed, (draft, { error }) => {
      draft.status = AlgorithmStatus.parsingFailed
      draft.error = error
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
      draft.results = draft.results.map((oldResult) =>
        oldResult.seqName === seqName
          ? { ...oldResult, error: undefined, result, status: AnylysisStatus.done }
          : oldResult,
      )
    }),
  )

  .withHandling(
    immerCase(analyzeAsync.failed, (draft, { params: { seqName }, error }) => {
      draft.status = AlgorithmStatus.failed
      draft.results = draft.results.map((oldResult) =>
        oldResult.seqName === seqName ? { ...oldResult, error, status: AnylysisStatus.failed } : oldResult,
      )
    }),
  )
