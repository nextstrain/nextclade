/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { DeepPartial, StrictOmit } from 'ts-essentials'
import { composeWithDevTools } from 'redux-devtools-extension'

import type { Action } from 'src/state/util/fsaActions'
import { isType } from 'src/state/util/fsaActions'

import type { State } from 'src/state/reducer'
import type { AlgorithmParams, SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import type { AuspiceEntropyState, AuspiceTreeState } from 'auspice'
import { analyzeAsync, setInput, treeBuildAsync } from 'src/state/algorithm/algorithm.actions'

const TOO_BIG = '<<TOO_BIG>>' as const

export function sanitizeParams(params?: DeepPartial<AlgorithmParams>) {
  if (!params) {
    return undefined
  }

  // @ts-ignore
  const seq = params.seq ? TOO_BIG : undefined
  const rootSeq = params.rootSeq ? TOO_BIG : undefined
  const input = params.input ? TOO_BIG : undefined
  return { ...params, seq, rootSeq, input }
}

export function sanitizeResult(result?: { alignedQuery: string }) {
  if (!result) {
    return undefined
  }

  const alignedQuery = result.alignedQuery ? TOO_BIG : undefined

  // @ts-ignore
  return { ...result, alignedQuery }
}

export function sanitizeResults(results: SequenceAnalysisState[] = []) {
  let newResults = results
  if (results && results.length > 20) {
    return TOO_BIG
  }
  // @ts-ignore
  newResults = newResults?.map((result) => ({ ...result, result: sanitizeResult(result.result) }))
  return newResults
}

export interface AuspiceTreeStateLite
  extends StrictOmit<AuspiceTreeState, 'nodes' | 'visibility' | 'nodeColors' | 'branchThickness'> {
  nodes: string
  visibility: string
  nodeColors: string
  branchThickness: string
}

function sanitizeTree(tree: AuspiceTreeState = {}): AuspiceTreeStateLite {
  return { ...tree, nodes: TOO_BIG, visibility: TOO_BIG, nodeColors: TOO_BIG, branchThickness: TOO_BIG }
}

function sanitizeEntropy(entropy: AuspiceEntropyState = {}) {
  return { ...entropy, bars: TOO_BIG }
}

export function withReduxDevTools<StoreEnhancerIn, StoreEnhancerOut>(
  enhancer: StoreEnhancerIn,
): StoreEnhancerIn | StoreEnhancerOut {
  if (!(process.env.ENABLE_REDUX_DEV_TOOLS === 'true' && composeWithDevTools)) {
    return enhancer
  }

  // @ts-ignore
  const compose = composeWithDevTools({
    // @ts-ignore
    actionSanitizer(action: Action<unknown>) {
      // @ts-ignore
      if (action.type === 'CLEAN_START') {
        return {
          ...action,
          // @ts-ignore
          tree: sanitizeTree(action.tree),
          // @ts-ignore
          entropy: sanitizeEntropy(action.controls),
        }
      }

      if (isType(action, setInput)) {
        return {
          ...action,
          payload: TOO_BIG,
        }
      }

      if (isType(action, analyzeAsync.started)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            seq: TOO_BIG,
            rootSeq: TOO_BIG,
          },
        }
      }

      if (isType(action, treeBuildAsync.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: {
              // @ts-ignore
              ...sanitizeParams(action.payload.params),
              // @ts-ignore
              analysisResults: sanitizeResults(action.payload.params.analysisResults),
              // @ts-ignore
              auspiceData: sanitizeTree(action.payload.params.auspiceData),
            },
          },
        }
      }

      if (isType(action, analyzeAsync.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: {
              ...action.payload.params,
              seq: TOO_BIG,
              rootSeq: TOO_BIG,
            },
            result: sanitizeResult(action.payload.result),
          },
        }
      }

      return {
        ...action,
        payload: {
          // @ts-ignore
          params: sanitizeParams(action.payload?.params),
          // @ts-ignore
          result: sanitizeResult(action.payload?.result),
        },
      }
    },

    stateSanitizer(state: State) {
      return {
        ...state,
        algorithm: {
          ...state.algorithm,
          params: sanitizeParams(state.algorithm.params),
          results: sanitizeResults(state.algorithm.results),
          resultsFiltered: sanitizeResults(state.algorithm.results),
        },
        tree: sanitizeTree(state.tree),
        entropy: sanitizeEntropy(state.controls),
      }
    },

    trace: true,
    traceLimit: 25,
    actionsBlacklist: '@@INIT',
  })

  // @ts-ignore
  return compose(enhancer)
}
