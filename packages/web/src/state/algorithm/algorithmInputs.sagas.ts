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
} from 'src/state/algorithm/algorithm.actions'

import {
  parseGeneMapGffString,
  parsePcrPrimerCsvRowsStr,
  parseQcConfigString,
  parseRefSequence,
  parseTree,
} from 'src/workers/run'

export function* loadFasta(input: AlgorithmInput) {
  const queryStr = yield* call([input, input.getContent])
  // TODO: validate fasta file format
  return { queryStr, queryName: input.name }
}

export function* loadTree(input: AlgorithmInput) {
  const treeJson = yield* call([input, input.getContent])
  const treeStr = yield* call(parseTree, treeJson)
  return { treeStr }
}

export function* loadRootSeq(input: AlgorithmInput) {
  const refFastaStr = yield* call([input, input.getContent])
  return yield* call(parseRefSequence, refFastaStr, input.name)
}

export function* loadQcSettings(input: AlgorithmInput) {
  const qcConfigRawStr = yield* call([input, input.getContent])
  const qcConfigStr = yield* call(parseQcConfigString, qcConfigRawStr)
  return { qcConfigStr }
}

export function* loadGeneMap(input: AlgorithmInput) {
  const geneMapStrRaw = yield* call([input, input.getContent])
  const geneMapStr = yield* call(parseGeneMapGffString, geneMapStrRaw, input.name)
  return { geneMapStr }
}

export function* loadPcrPrimers(input: AlgorithmInput) {
  const pcrPrimersStrRaw = yield* call([input, input.getContent])
  const pcrPrimerCsvRowsStr = yield* call(parsePcrPrimerCsvRowsStr, pcrPrimersStrRaw, input.name)
  return { pcrPrimerCsvRowsStr }
}

export default [
  takeEvery(setFasta.trigger, fsaSaga(setFasta, loadFasta)),
  takeEvery(setTree.trigger, fsaSaga(setTree, loadTree)),
  takeEvery(setRootSeq.trigger, fsaSaga(setRootSeq, loadRootSeq)),
  takeEvery(setQcSettings.trigger, fsaSaga(setQcSettings, loadQcSettings)),
  takeEvery(setGeneMap.trigger, fsaSaga(setGeneMap, loadGeneMap)),
  takeEvery(setPcrPrimers.trigger, fsaSaga(setPcrPrimers, loadPcrPrimers)),
]
