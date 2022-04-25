import { call, takeEvery } from 'typed-redux-saga'

import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import fsaSaga from 'src/state/util/fsaSaga'

import {
  setFasta,
  setGeneMap,
  setPcrPrimers,
  setQcSettings,
  setRootSeq,
  setTree,
  setVirusJson,
} from 'src/state/algorithm/algorithm.actions'

export function* loadFasta(input: AlgorithmInput) {
  const queryStr = yield* call([input, input.getContent])
  // TODO: validate fasta file format
  return { queryStr, queryName: input.name }
}

export function* loadTree(input: AlgorithmInput) {
  const treeStr = yield* call([input, input.getContent])
  return { treeStr }
}

export function* loadRootSeq(input: AlgorithmInput) {
  const refStr = yield* call([input, input.getContent])
  return { refStr, refName: input.name }
}

export function* loadQcSettings(input: AlgorithmInput) {
  const qcConfigStr = yield* call([input, input.getContent])
  return { qcConfigStr }
}

export function* loadVirusJson(input: AlgorithmInput) {
  const virusJsonStr = yield* call([input, input.getContent])
  return { virusJsonStr }
}

export function* loadGeneMap(input: AlgorithmInput) {
  const geneMapStr = yield* call([input, input.getContent])
  return { geneMapStr }
}

export function* loadPcrPrimers(input: AlgorithmInput) {
  const pcrPrimerCsvRowsStr = yield* call([input, input.getContent])
  return { pcrPrimerCsvRowsStr }
}

export default [
  takeEvery(setFasta.trigger, fsaSaga(setFasta, loadFasta)),
  takeEvery(setTree.trigger, fsaSaga(setTree, loadTree)),
  takeEvery(setRootSeq.trigger, fsaSaga(setRootSeq, loadRootSeq)),
  takeEvery(setQcSettings.trigger, fsaSaga(setQcSettings, loadQcSettings)),
  takeEvery(setVirusJson.trigger, fsaSaga(setVirusJson, loadVirusJson)),
  takeEvery(setGeneMap.trigger, fsaSaga(setGeneMap, loadGeneMap)),
  takeEvery(setPcrPrimers.trigger, fsaSaga(setPcrPrimers, loadPcrPrimers)),
]
