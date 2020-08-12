/* eslint-disable @typescript-eslint/ban-ts-comment */
import { composeWithDevTools } from 'redux-devtools-extension'
import type { Action } from 'typescript-fsa'

import type { State } from 'src/state/reducer'
import type { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'
import { AuspiceEntropyState, AuspiceTreeState } from 'auspice'
import { StrictOmit } from 'ts-essentials'

const TOO_BIG = '<<TOO_BIG>>' as const

function sanitizeResults(results: SequenceAnylysisState[] = []) {
  return results && results.length > 20 ? TOO_BIG : results
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
      if (action.type === 'CLEAN_START' && action?.tree) {
        return {
          ...action,
          // @ts-ignore
          tree: sanitizeTree(action?.tree),
          // @ts-ignore
          entropy: sanitizeEntropy(action?.controls),
        }
      }
      return action
    },

    stateSanitizer(state: State) {
      return {
        ...state,
        algorithm: {
          ...state.algorithm,
          results: sanitizeResults(state.algorithm.results),
          resultsFiltered: sanitizeResults(state.algorithm.results),
        },
        tree: sanitizeTree(state?.tree),
        entropy: sanitizeEntropy(state?.controls),
      }
    },

    trace: true,
    traceLimit: 25,
    actionsBlacklist: '@@INIT',
  })

  // @ts-ignore
  return compose(enhancer)
}
