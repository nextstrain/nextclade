/* eslint-disable @typescript-eslint/ban-ts-comment */
// noinspection JSUnusedGlobalSymbols,SuspiciousTypeOfGuard

import { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import type { DeepPartial, StrictOmit } from 'ts-essentials'
import { composeWithDevTools } from 'redux-devtools-extension'

import type { Action } from 'src/state/util/fsaActions'
import { isType } from 'src/state/util/fsaActions'

import type { State } from 'src/state/reducer'
import type { AlgorithmParams, SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import type { AuspiceEntropyState, AuspiceTreeState } from 'auspice'
import {
  setFasta,
  setTreeResult,
  setRootSeq,
  setTree,
  addNextcladeResult,
  setQcSettings,
  setGeneMap,
  setPcrPrimers,
} from 'src/state/algorithm/algorithm.actions'
import { Peptide } from 'src/algorithms/types'

const TRUNCATED = ' ... (truncated)' as const

function truncate(x?: string) {
  if (!x || typeof x !== 'string') {
    return undefined
  }

  return x.slice(0, 48) + TRUNCATED
}

function truncateContent(input?: DeepPartial<AlgorithmInput>) {
  if (!input) {
    return undefined
  }

  // @ts-ignore
  return { ...input, content: input.content ? truncate(input.content) : undefined }
}

export function sanitizeParams(params?: AlgorithmParams) {
  if (!params) {
    return undefined
  }

  return {
    ...params,
    seqData: truncate(params.seqData),
    raw: {
      ...params.raw,
      seqData: truncateContent(params.raw?.seqData),
      auspiceData: truncateContent(params.raw?.auspiceData),
      rootSeq: truncateContent(params.raw?.rootSeq),
      qcRulesConfig: truncateContent(params.raw?.qcRulesConfig),
      geneMap: truncateContent(params.raw?.geneMap),
      pcrPrimers: truncateContent(params.raw?.pcrPrimers),
    },
    strings: {
      ...params.strings,
      queryStr: truncate(params.strings?.queryStr),
      refStr: truncate(params.strings?.refStr),
      geneMapStr: truncate(params.strings?.geneMapStr),
      treeStr: truncate(params.strings?.treeStr),
      pcrPrimerCsvRowsStr: truncate(params.strings?.pcrPrimerCsvRowsStr),
      qcConfigStr: truncate(params.strings?.qcConfigStr),
    },
  }
}

export function sanitizeResult(result?: { query?: string; queryPeptides?: Peptide[] }) {
  if (!result) {
    return undefined
  }

  const query = truncate(result.query)
  const queryPeptides = result?.queryPeptides?.map(({ name, seq }) => ({ name, seq: truncate(seq) }))

  return { ...result, query, queryPeptides }
}

export function sanitizeResults(results: SequenceAnalysisState[] = []) {
  let newResults = results
  if (results && results.length > 20) {
    newResults = newResults.slice(0, 20)
  }

  // @ts-ignore
  newResults = newResults?.map(sanitizeResult)
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
  return { ...tree, nodes: TRUNCATED, visibility: TRUNCATED, nodeColors: TRUNCATED, branchThickness: TRUNCATED }
}

function sanitizeEntropy(entropy: AuspiceEntropyState = {}) {
  return { ...entropy, bars: TRUNCATED }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function withReduxDevTools<StoreEnhancerIn, StoreEnhancerOut>(
  enhancer: StoreEnhancerIn,
): StoreEnhancerIn | StoreEnhancerOut {
  if (!(process.env.ENABLE_REDUX_DEV_TOOLS === 'true' && composeWithDevTools)) {
    return enhancer
  }

  const compose = composeWithDevTools({
    // @ts-ignore
    actionSanitizer(action: Action<unknown>) {
      if (action.type === 'CLEAN_START' || action.type === 'NEW_COLORS') {
        return { type: action.type, note: 'action content is truncated' }
      }

      if (
        isType(action, setFasta.trigger) ||
        isType(action, setTree.trigger) ||
        isType(action, setRootSeq.trigger) ||
        isType(action, setGeneMap.trigger) ||
        isType(action, setQcSettings.trigger) ||
        isType(action, setPcrPrimers.trigger) ||
        isType(action, setFasta.started) ||
        isType(action, setTree.started) ||
        isType(action, setRootSeq.started) ||
        isType(action, setGeneMap.started) ||
        isType(action, setQcSettings.started) ||
        isType(action, setPcrPrimers.started)
      ) {
        return {
          ...action,
          payload: truncateContent(action.payload),
        }
      }

      if (isType(action, setFasta.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: truncateContent(action.payload.params),
            result: {
              ...action.payload.result,
              queryStr: truncate(action.payload.result.queryStr),
            },
          },
        }
      }

      if (isType(action, setRootSeq.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: truncateContent(action.payload.params),
            result: {
              ...action.payload.result,
              refStr: truncate(action.payload.result.refStr),
            },
          },
        }
      }

      if (isType(action, setTree.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: truncateContent(action.payload.params),
            result: {
              ...action.payload.result,
              treeStr: truncate(action.payload.result.treeStr),
            },
          },
        }
      }

      if (isType(action, setQcSettings.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: truncateContent(action.payload.params),
            result: {
              ...action.payload.result,
              qcConfigStr: truncate(action.payload.result.qcConfigStr),
            },
          },
        }
      }

      if (isType(action, setGeneMap.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: truncateContent(action.payload.params),
            result: {
              ...action.payload.result,
              geneMapStr: truncate(action.payload.result.geneMapStr),
            },
          },
        }
      }

      if (isType(action, setPcrPrimers.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: truncateContent(action.payload.params),
            result: {
              ...action.payload.result,
              pcrPrimerCsvRowsStr: truncate(action.payload.result.pcrPrimerCsvRowsStr),
            },
          },
        }
      }

      if (isType(action, setTreeResult)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            treeStr: truncate(action.payload.treeStr),
          },
        }
      }

      if (isType(action, addNextcladeResult)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            nextcladeResult: {
              ...action.payload.nextcladeResult,
              ref: TRUNCATED,
              query: TRUNCATED,
              queryPeptides: TRUNCATED,
            },
          },
        }
      }

      return action
    },

    stateSanitizer(state: State) {
      return {
        ...state,
        algorithm: {
          ...state.algorithm,
          params: sanitizeParams(state.algorithm.params),
          results: sanitizeResults(state.algorithm.results),
          resultsFiltered: sanitizeResults(state.algorithm.results),
          treeStr: truncate(state.algorithm.treeStr),
        },
        tree: sanitizeTree(state.tree),
        entropy: sanitizeEntropy(state.controls),
        browserDimensions: TRUNCATED,
        controls: TRUNCATED,
        frequencies: TRUNCATED,
        general: TRUNCATED,
        metadata: TRUNCATED,
        narrative: TRUNCATED,
        notifications: TRUNCATED,
        query: TRUNCATED,
        treeToo: TRUNCATED,
      }
    },

    trace: true,
    traceLimit: 25,
    actionsBlacklist: '@@INIT',
  })

  // @ts-ignore
  return compose(enhancer)
}
