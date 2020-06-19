import { alignPairwise } from './alignPairwise'

import type { AnalyzeSeqResult } from './run'
import { Base } from './run'

export function analyzeSeq(seq: string, rootSeq: string): AnalyzeSeqResult {
  const { query, ref, score } = alignPairwise(seq, rootSeq)
  console.log('Alignment score:', score)

  // report insertions
  let refPos = 0
  let ins = ''
  let insStart = -1
  const insertions: Record<number, Base> = {}
  ref.forEach((d, i) => {
    if (d === '-') {
      if (ins === '') {
        insStart = refPos
      }
      ins += query[i]
    } else {
      // TODO: verify the conditional here. (Note, `'' === true`)
      if (ins) {
        insertions[insStart] = ins as Base
        ins = ''
      }
      refPos += 1
    }
  })
  // add insertion at the end of the reference if it exists
  if (ins) {
    insertions[insStart] = ins as Base
  }
  // strip insertions relative to reference
  const refStripped = query.filter((d, i) => ref[i] !== '-')

  // report mutations
  let nDel = 0
  let delPos = -1
  let beforeAlignment = true
  const mutations: Record<string, Base> = {}
  const deletions: Record<string, number> = {}
  let alnStart = -1
  let alnEnd = -1
  refStripped.forEach((d, i) => {
    if (d !== '-') {
      if (beforeAlignment) {
        alnStart = i
        beforeAlignment = false
      } else if (nDel) {
        deletions[delPos] = nDel
        nDel = 0
      }
      alnEnd = i
    }
    if (d !== '-' && d !== rootSeq[i] && d != 'N') {
      mutations[i] = d as Base
    } else if (d === '-' && !beforeAlignment) {
      if (!nDel) {
        delPos = i
      }
      nDel++
    }
  })
  return { mutations, insertions, deletions, alnStart, alnEnd }
}
