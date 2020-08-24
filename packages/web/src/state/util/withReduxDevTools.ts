/* eslint-disable @typescript-eslint/ban-ts-comment */
import { composeWithDevTools } from 'redux-devtools-extension'
import type { Action } from 'typescript-fsa'

import type { State } from 'src/state/reducer'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { AuspiceEntropyState, AuspiceTreeState } from 'auspice'
import { StrictOmit } from 'ts-essentials'

const TOO_BIG = '<<TOO_BIG>>' as const

export function sanitizeResult(result?: SequenceAnalysisState) {
  if (!result) {
    return undefined
  }
  // @ts-ignore
  return { ...result, alignedQuery: TOO_BIG }
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

      return {
        ...action,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: {
          // @ts-ignore
          ...(action.payload ?? {}),
          result: sanitizeResult(action.payload?.result),
        },
      }
    },

    stateSanitizer(state: State) {
      return {
        ...state,
        algorithm: {
          ...state.algorithm,
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
