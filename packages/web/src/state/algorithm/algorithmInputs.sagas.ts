import { call, select, takeEvery } from 'typed-redux-saga'

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
  parsePcrPrimersCsvString,
  parseQcConfigString,
  parseRefSequence,
  treePrepare,
} from 'src/workers/run'
import { selectOrThrow } from 'src/state/util/selectOrThrow'
import { selectRefSeq } from 'src/state/algorithm/algorithm.selectors'

export function* loadFasta(input: AlgorithmInput) {
  const queryStr = yield* call([input, input.getContent])
  // TODO: validate fasta file format
  return { queryStr }
}

export function* loadTree(input: AlgorithmInput) {
  const treeJson = yield* call([input, input.getContent])
  const refStr = yield* selectOrThrow(selectRefSeq, 'Reference sequence')
  // FIXME: need to wait here until ref sequence is fully loaded
  const refTreeStr = yield* call(treePrepare, treeJson, refStr)
  // TODO: make use of gene map from the tree
  // geneMapValidate(auspiceData.meta?.genome_annotations)
  return { refTreeStr }
}

export function* loadRootSeq(input: AlgorithmInput) {
  const refFastaStr = yield* call([input, input.getContent])
  const refStr = yield* call(parseRefSequence, refFastaStr)
  return { refStr }
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
  const refStr = yield* selectOrThrow(selectRefSeq, 'Reference sequence')
  const pcrPrimersStr = yield* call(parsePcrPrimersCsvString, pcrPrimersStrRaw, input.name, refStr)
  return { pcrPrimersStr }
}

export default [
  takeEvery(setFasta.trigger, fsaSaga(setFasta, loadFasta)),
  takeEvery(setTree.trigger, fsaSaga(setTree, loadTree)),
  takeEvery(setRootSeq.trigger, fsaSaga(setRootSeq, loadRootSeq)),
  takeEvery(setQcSettings.trigger, fsaSaga(setQcSettings, loadQcSettings)),
  takeEvery(setGeneMap.trigger, fsaSaga(setGeneMap, loadGeneMap)),
  takeEvery(setPcrPrimers.trigger, fsaSaga(setPcrPrimers, loadPcrPrimers)),
]
