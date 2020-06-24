import actionCreatorFactory from 'typescript-fsa'

import type { AnalysisResult } from 'src/algorithms/types'

const action = actionCreatorFactory('ALGORITHM')

export const setParams = action<{ input: string; rootSeq: string }>('SET_PARAMS')

export const setInput = action<string>('SET_INPUT')

export const algorithmRunTrigger = action('RUN_TRIGGER')

export const algorithmRunAsync = action.async<void, void, void>('RUN')

export const parseAsync = action.async<void, string[], Error>('PARSE')

export const analyzeAsync = action.async<{ seqName: string }, AnalysisResult, Error>('ANALYZE')

export const exportTrigger = action('EXPORT')
