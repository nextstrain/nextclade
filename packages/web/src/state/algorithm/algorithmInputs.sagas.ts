import { convertPcrPrimers } from 'src/algorithms/primers/convertPcrPrimers'
import { validatePcrPrimerEntries, validatePcrPrimers } from 'src/algorithms/primers/validatePcrPrimers'
import { parseCsv } from 'src/io/parseCsv'
import { call, select, takeEvery } from 'typed-redux-saga'

import fsaSaga from 'src/state/util/fsaSaga'

import type { AlgorithmInput } from 'src/algorithms/types'
import { parseSequences } from 'src/algorithms/parseSequences'
import { qcRulesConfigValidate, qcRulesConfigDeserialize } from 'src/algorithms/QC/qcRulesConfigValidate'
import { treeDeserialize, treeValidate } from 'src/algorithms/tree/treeValidate'
import { sanitizeRootSeq } from 'src/helpers/sanitizeRootSeq'
import { geneMapDeserialize, geneMapValidate, getGeneMap } from 'src/io/getGeneMap'
import {
  setFasta,
  setGeneMap,
  setPcrPrimers,
  setQcSettings,
  setRootSeq,
  setTree,
} from 'src/state/algorithm/algorithm.actions'
import { State } from '../reducer'

export function* loadFasta(input: AlgorithmInput) {
  return yield* call([input, input.getContent])
}

export function* loadTree(input: AlgorithmInput) {
  const content = yield* call([input, input.getContent])
  return treeValidate(treeDeserialize(content))
}

export function* loadRootSeq(input: AlgorithmInput) {
  const content = yield* call([input, input.getContent])

  const sequences = parseSequences(content)
  const entries = Object.entries(sequences)
  const n = entries.length

  if (n !== 1) {
    throw new Error(`Expected exactly 1 root sequence, but received ${n}`)
  }

  const rootSeq = entries[0][1]

  return sanitizeRootSeq(rootSeq)
}

export function* loadQcSettings(input: AlgorithmInput) {
  const content = yield* call([input, input.getContent])
  return qcRulesConfigValidate(qcRulesConfigDeserialize(content))
}

export function* loadGeneMap(input: AlgorithmInput) {
  const content = yield* call([input, input.getContent])
  const geneMapJsonDangerous = geneMapDeserialize(content)
  const geneMapJson = geneMapValidate(geneMapJsonDangerous)
  return getGeneMap(geneMapJson)
}

export function* loadPcrPrimers(input: AlgorithmInput) {
  const content = yield* call([input, input.getContent])

  // TODO: this assumes that the correct root sequence is loaded before PCR primers
  //  Instead, we need to recalculate primers on every root sequence update
  const rootSeq = yield* select((state: State) => state.algorithm.params.virus.rootSeq)

  const primerEntries = validatePcrPrimerEntries(parseCsv(content))
  return validatePcrPrimers(convertPcrPrimers(primerEntries, rootSeq))
}

export default [
  takeEvery(setFasta.trigger, fsaSaga(setFasta, loadFasta)),
  takeEvery(setTree.trigger, fsaSaga(setTree, loadTree)),
  takeEvery(setRootSeq.trigger, fsaSaga(setRootSeq, loadRootSeq)),
  takeEvery(setQcSettings.trigger, fsaSaga(setQcSettings, loadQcSettings)),
  takeEvery(setGeneMap.trigger, fsaSaga(setGeneMap, loadGeneMap)),
  takeEvery(setPcrPrimers.trigger, fsaSaga(setPcrPrimers, loadPcrPrimers)),
]
