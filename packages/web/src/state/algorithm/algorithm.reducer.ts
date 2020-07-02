import { DeepWritable } from 'ts-essentials'

import { reducerWithInitialState } from 'typescript-fsa-reducers'

import { algorithmRunAsync, analyzeAsync, parseAsync, setInput, setInputFile, setIsDirty } from './algorithm.actions'
import { agorithmDefaultState, AlgorithmStatus, AnylysisStatus, SequenceAnylysisState } from './algorithm.state'

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
      draft.results = draft.results.map((oldResult) =>
        oldResult.seqName === seqName
          ? { ...oldResult, errors: [error.message], status: AnylysisStatus.failed }
          : oldResult,
      )
    }),
  )
