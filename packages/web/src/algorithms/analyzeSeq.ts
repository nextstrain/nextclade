import { canonicalNucleotides } from './nucleotideCodes'
import type { AnalyzeSeqResult, Nucleotide } from './types'

export function analyzeSeq(query: string[], ref: string[]): AnalyzeSeqResult {
  // report insertions
  let refPos = 0
  let ins = ''
  let insStart = -1
  const insertions: Record<number, Nucleotide> = {}
  ref.forEach((d, i) => {
    if (d === '-') {
      if (ins === '') {
        insStart = refPos
      }
      ins += query[i]
    } else {
      if (ins.length > 0) {
        insertions[insStart] = ins as Nucleotide
        ins = ''
      }
      refPos += 1
    }
  })
  // add insertion at the end of the reference if it exists
  if (ins) {
    insertions[insStart] = ins as Nucleotide
  }
  // strip insertions relative to reference
  const refStrippedQuery = query.filter((d, i) => ref[i] !== '-')
  const refStripped = ref.filter((d) => d !== '-')

  // report mutations
  let nDel = 0
  let delPos = -1
  let beforeAlignment = true
  const substitutions: Record<string, Nucleotide> = {}
  const deletions: Record<string, number> = {}
  let alignmentStart = -1
  let alignmentEnd = -1
  refStrippedQuery.forEach((d, i) => {
    if (d !== '-') {
      if (beforeAlignment) {
        alignmentStart = i
        beforeAlignment = false
      } else if (nDel) {
        deletions[delPos] = nDel
        nDel = 0
      }
      alignmentEnd = i
    }
    if (d !== '-' && d !== refStripped[i] && canonicalNucleotides.has(d)) {
      substitutions[i] = d as Nucleotide
    } else if (d === '-' && !beforeAlignment) {
      if (!nDel) {
        delPos = i
      }
      nDel++
    }
  })
  return { substitutions, insertions, deletions, alignmentStart, alignmentEnd }
}
