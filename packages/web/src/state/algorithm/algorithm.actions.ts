import actionCreatorFactory from 'typescript-fsa'

import type { AnalysisResult } from 'src/algorithms/types'
import type { QCResult } from 'src/algorithms/QC/runQC'
import type { Sorting } from 'src/helpers/resultsSort'
import type { InputFile } from './algorithm.state'

const action = actionCreatorFactory('Algorithm')

export const setInput = action<string>('setInput')
export const setInputFile = action<InputFile>('setInputFile')
export const setIsDirty = action<boolean>('setIsDirty')

export const algorithmRunTrigger = action<string | File | undefined>('runTrigger')
export const algorithmRunAsync = action.async<string | File | undefined, void, void>('run')

export const parseAsync = action.async<void, string[], Error>('parse')
export const analyzeAsync = action.async<{ seqName: string }, AnalysisResult, Error>('analyze')
export const runQcAsync = action.async<{ seqName: string }, QCResult, Error>('runQc')

export const exportCsvTrigger = action('exportCsvTrigger')
export const exportJsonTrigger = action('exportJsonTrigger')
export const exportAuspiceJsonV2Trigger = action('exportAuspiceJsonV2Trigger')

export const setSeqNamesFilter = action<string | undefined>('setSeqNamesFilter')
export const setMutationsFilter = action<string | undefined>('setMutationsFilter')
export const setAAFilter = action<string | undefined>('setAAFilter')
export const setCladesFilter = action<string | undefined>('setCladesFilter')

export const setHasNoQcIssuesFilter = action<boolean>('setHasNoQcIssuesFilter')
export const setHasQcIssuesFilter = action<boolean>('setHasQcIssuesFilter')
export const setHasErrorsFilter = action<boolean>('setHasErrorsFilter')

export const resultsSortTrigger = action<Sorting>('resultsSortTrigger')
