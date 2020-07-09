import actionCreatorFactory from 'typescript-fsa'

import type { AnalysisResult } from 'src/algorithms/types'
import type { InputFile } from './algorithm.state'

const action = actionCreatorFactory('ALGORITHM')

export const setInput = action<string>('SET_INPUT')

export const setInputFile = action<InputFile>('SET_INPUT_FILE')

export const setIsDirty = action<boolean>('SET_IS_DIRTY')

export const algorithmRunTrigger = action<string | File | undefined>('RUN_TRIGGER')

export const algorithmRunAsync = action.async<string | File | undefined, void, void>('RUN')

export const parseAsync = action.async<void, string[], Error>('PARSE')

export const analyzeAsync = action.async<{ seqName: string }, AnalysisResult, Error>('ANALYZE')

export const exportCsvTrigger = action('EXPORT_CSV')

export const exportJsonTrigger = action('EXPORT_JSON')

export const setSeqNamesFilter = action<string | undefined>('setSeqNamesFilter')
export const setMutationsFilter = action<string | undefined>('setMutationsFilter')
export const setAAFilter = action<string | undefined>('setAAFilter')
export const setCladesFilter = action<string | undefined>('setCladesFilter')

export const setHasNoQcIssuesFilter = action<boolean>('setHasNoQcIssuesFilter')
export const setHasQcIssuesFilter = action<boolean>('setHasQcIssuesFilter')
export const setHasErrorsFilter = action<boolean>('setHasErrorsFilter')
