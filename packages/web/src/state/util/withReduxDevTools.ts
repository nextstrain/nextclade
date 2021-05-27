/* eslint-disable camelcase,@typescript-eslint/ban-ts-comment */
import { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import type { DeepPartial, StrictOmit } from 'ts-essentials'
import { composeWithDevTools } from 'redux-devtools-extension'

import type { Action } from 'src/state/util/fsaActions'
import { isType } from 'src/state/util/fsaActions'

import type { State } from 'src/state/reducer'
import type { AlgorithmParams, SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import type { AuspiceEntropyState, AuspiceJsonV2, AuspiceTreeNode, AuspiceTreeState } from 'auspice'
import {
  analyzeAsync,
  setFasta,
  setOutputTree,
  setRootSeq,
  setTree,
  treeBuildAsync,
  parseAsync,
  treeFinalizeAsync,
  addParsedSequence,
  addNextcladeResult,
  setQcResults,
  setQcSettings,
  setGeneMap,
  setPcrPrimers,
} from 'src/state/algorithm/algorithm.actions'
import { setQcRulesConfig } from 'src/state/settings/settings.actions'

const TRUNCATED = ' ... (truncated)' as const

function truncate(x?: string) {
  if (!x || typeof x !== 'string') {
    return undefined
  }

  return x.slice(0, 48) + TRUNCATED
}

function truncateStringOrFile(x?: string | File) {
  if (!x || typeof x !== 'string') {
    return undefined
  }

  return truncate(x)
}

function truncateContent(input?: DeepPartial<AlgorithmInput>) {
  if (!input) {
    return undefined
  }

  // @ts-ignore
  return { ...input, content: input.content ? truncate(input.content) : undefined }
}

interface AuspiceTreeNodeTruncated {
  name?: string
  node_attrs: 'truncated'
  branch_attrs: 'truncated'
  children: 'truncated'
}

interface AuspiceJsonV2Truncated {
  version?: string
  meta: 'truncated'
  tree?: AuspiceTreeNodeTruncated
}

function truncateTreeNode(node?: AuspiceTreeNode): AuspiceTreeNodeTruncated | undefined {
  if (!node) {
    return undefined
  }

  return {
    name: node.name,
    branch_attrs: 'truncated',
    node_attrs: 'truncated',
    children: 'truncated',
  }
}

function truncateTreeJson(tree?: AuspiceJsonV2): AuspiceJsonV2Truncated | undefined {
  if (!tree) {
    return undefined
  }

  return {
    ...tree,
    meta: 'truncated',
    tree: truncateTreeNode(tree.tree),
  }
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
      refTreeStr: truncate(params.strings?.refTreeStr),
      pcrPrimerCsvRowsStr: truncate(params.strings?.pcrPrimerCsvRowsStr),
      qcConfigStr: truncate(params.strings?.qcConfigStr),
    },
  }
}

export function sanitizeResult(result?: { alignedQuery: string }) {
  if (!result) {
    return undefined
  }

  const alignedQuery = result.alignedQuery ? TRUNCATED : undefined

  return { ...result, alignedQuery }
}

export function sanitizeResults(results: SequenceAnalysisState[] = []) {
  let newResults = results
  if (results && results.length > 20) {
    return TRUNCATED
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
              refTreeStr: truncate(action.payload.result.refTreeStr),
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

      if (isType(action, analyzeAsync.started)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            seq: truncate(action.payload.seq),
            rootSeq: truncate(action.payload.rootSeq),
            auspiceData: truncateTreeJson(action.payload.auspiceData),
            geneMap: TRUNCATED,
            pcrPrimers: TRUNCATED,
          },
        }
      }

      if (isType(action, analyzeAsync.done)) {
        return {
          ...action,
          payload: {
            params: {
              ...action.payload.params,
              seq: truncate(action.payload.params.seq),
              rootSeq: truncate(action.payload.params.rootSeq),
              auspiceData: truncateTreeJson(action.payload.params.auspiceData),
              geneMap: TRUNCATED,
              pcrPrimers: TRUNCATED,
            },
            result: sanitizeResult(action.payload.result),
          },
        }
      }

      if (isType(action, parseAsync.started)) {
        return {
          ...action,
          payload: truncateStringOrFile(action.payload),
        }
      }

      if (isType(action, parseAsync.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: truncateStringOrFile(action.payload.params),
            result: {
              ...action.payload.result,
            },
          },
        }
      }

      if (isType(action, setOutputTree)) {
        return { ...action, payload: truncate(action.payload) }
      }

      if (isType(action, treeBuildAsync.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: {
              ...action.payload.params,
              rootSeq: truncate(action.payload.params.rootSeq),
              analysisResults: sanitizeResult(action.payload.params.analysisResult),
              auspiceData: truncateTreeJson(action.payload.params.auspiceData),
            },
            result: {
              ...action.payload.result,
              match: truncateTreeNode(action.payload.result.match),
            },
          },
        }
      }

      if (isType(action, analyzeAsync.started)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            seq: truncate(action.payload.seq),
            rootSeq: truncate(action.payload.rootSeq),
            auspiceData: truncateTreeJson(action.payload.auspiceData),
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
              seq: truncate(action.payload.params.seq),
              rootSeq: truncate(action.payload.params.rootSeq),
              auspiceData: truncateTreeJson(action.payload.params.auspiceData),
            },
            result: sanitizeResult(action.payload.result),
          },
        }
      }

      if (isType(action, treeFinalizeAsync.started)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            rootSeq: truncate(action.payload.rootSeq),
            results: TRUNCATED,
            auspiceData: truncateTreeJson(action.payload.auspiceData),
          },
        }
      }

      if (isType(action, treeFinalizeAsync.done)) {
        return {
          ...action,
          payload: {
            ...action.payload,
            params: {
              ...action.payload.params,
              rootSeq: truncate(action.payload.params.rootSeq),
              results: TRUNCATED,
              auspiceData: truncateTreeJson(action.payload.params.auspiceData),
            },
            result: truncateTreeJson(action.payload.result),
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
          // results: sanitizeResults(state.algorithm.results),
          // resultsFiltered: sanitizeResults(state.algorithm.results),
          outputTree: truncate(state.algorithm.outputTree),
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
