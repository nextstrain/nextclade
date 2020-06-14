import { alignPairwise } from './alignPairwise'

export function analyzeSeq(seq, rootSeq) {
  const { query, ref, score } = alignPairwise(seq, rootSeq)
  console.log('Alignment score:', score)

  // report insertions
  let refPos = 0
  let ins = ''
  let insStart = -1
  ref.forEach((d, i) => {
    if (d === '-') {
      if (ins === '') {
        insStart = refPos
      }
      ins += query[i]
    } else {
      if (ins) {
        console.log(`insertion at position ${insStart}: ${ins}`)
        ins = ''
      }
      refPos += 1
    }
  })
  // strip insertions relative to reference
  const refStripped = query.filter((d, i) => ref[i] !== '-')

  // report mutations
  let lastChar = -1
  let nDel = 0
  let delPos = -1
  let beforeAlignment = true
  const mutations = {}
  refStripped.forEach((d, i) => {
    if (d !== '-') {
      if (beforeAlignment) {
        console.log(`Alignment start: ${i + 1}`)
        beforeAlignment = false
      } else if (nDel) {
        console.log(`Deletion of length ${nDel} at ${delPos + 1}`)
        nDel = 0
      }
      lastChar = i
    }
    if (d !== '-' && d !== rootSeq[i] && d != 'N') {
      console.log(`Mutation at position ${i + 1}: ${rootSeq[i]} --> ${d}`)
      mutations[i + 1] = d
    } else if (d === '-' && !beforeAlignment) {
      if (!nDel) {
        delPos = i
      }
      nDel++
    }
  })
  console.log(`Alignment end: ${lastChar + 1}`)
  return mutations
}
