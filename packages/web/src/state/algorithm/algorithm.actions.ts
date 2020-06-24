import actionCreatorFactory from 'typescript-fsa'

const action = actionCreatorFactory('ALGORITHM')

export const algorithmRunTrigger = action('RUN_TRIGGER')

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AlgorithmRunParams {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AlgorithmRunResults {}

export interface AlgorithmRunError {
  error: Error
}

export const algorithmRunAsync = action.async<void, AlgorithmRunResults, AlgorithmRunError>('RUN')

export const setParams = action<{ input: string; rootSeq: string }>('SET_PARAMS')

export const parseAsync = action.async<void, void, void>('PARSE')
export const analyzeAsync = action.async<void, void, void>('ANALYZE')
