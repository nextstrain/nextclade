import { alignPairwise } from './alignPairwise'

export function analyzeSeq(seq, rootSeq) {
  const { query, ref, score } = alignPairwise(seq, rootSeq)
  console.log('Alignment score:', score)

  // report insertions
  let refPos = 0
  let ins = ''
  let insStart = -1
  const insertions = {}
  ref.forEach((d, i) => {
    if (d === '-') {
      if (ins === '') {
        insStart = refPos
      }
      ins += query[i]
    } else {
      if (ins) {
        insertions[insStart] = ins
        ins = ''
      }
      refPos += 1
    }
  })
  // add insertion at the end of the reference if it exists
  if (ins) {
    insertions[insStart] = ins
  }
  // strip insertions relative to reference
  const refStripped = query.filter((d, i) => ref[i] !== '-')

  // report mutations
  let nDel = 0
  let delPos = -1
  let beforeAlignment = true
  const mutations = {}
  const deletions = {}
  let alnStart = -1, alnEnd = -1
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
      mutations[i] = d
    } else if (d === '-' && !beforeAlignment) {
      if (!nDel) {
        delPos = i
      }
      nDel++
    }
  })
  return {mutations, insertions, deletions, alnStart, alnEnd }
}
