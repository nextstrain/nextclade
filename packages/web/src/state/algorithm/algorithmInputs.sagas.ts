import { all, call, put, select, takeEvery } from 'typed-redux-saga'

import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import { AlgorithmInputString } from 'src/io/AlgorithmInput'
import fsaSaga from 'src/state/util/fsaSaga'

import {
  setDefaultData,
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
  treePrepare,
} from 'src/workers/run'
import { selectOrThrow, selectOrWait } from 'src/state/util/selectOrThrow'
import { selectRefSeq } from 'src/state/algorithm/algorithm.selectors'
import { getVirus } from 'src/algorithms/defaults/viruses'

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
  const pcrPrimerCsvRowsStr = yield* call(parsePcrPrimerCsvRowsStr, pcrPrimersStrRaw, input.name)
  return { pcrPrimerCsvRowsStr }
}

export function* loadDefaults(virusName?: string) {
  const virus = getVirus(virusName)

  // Load root sequence and wait until it's available in the state (tree and PCR primers rely on it)
  yield* put(setRootSeq.trigger(new AlgorithmInputString(virus.refFastaStr)))
  yield* selectOrWait(selectRefSeq, 'root sequence')

  // Load everything else
  yield* put(setTree.trigger(new AlgorithmInputString(virus.treeJson)))
  yield* put(setQcSettings.trigger(new AlgorithmInputString(virus.qcConfigRaw)))
  yield* put(setGeneMap.trigger(new AlgorithmInputString(virus.geneMapStrRaw)))
  yield* put(setPcrPrimers.trigger(new AlgorithmInputString(virus.pcrPrimersStrRaw)))
}

export default [
  takeEvery(setFasta.trigger, fsaSaga(setFasta, loadFasta)),
  takeEvery(setTree.trigger, fsaSaga(setTree, loadTree)),
  takeEvery(setRootSeq.trigger, fsaSaga(setRootSeq, loadRootSeq)),
  takeEvery(setQcSettings.trigger, fsaSaga(setQcSettings, loadQcSettings)),
  takeEvery(setGeneMap.trigger, fsaSaga(setGeneMap, loadGeneMap)),
  takeEvery(setPcrPrimers.trigger, fsaSaga(setPcrPrimers, loadPcrPrimers)),
  takeEvery(setDefaultData.trigger, fsaSaga(setDefaultData, loadDefaults)),
]
