import { canonicalNucleotides } from './nucleotideCodes'
import type { Nucleotide, NucleotideDeletion, NucleotideSubstitution, NucleotideInsertion } from './types'

export interface AnalyzeSeqResult {
  substitutions: NucleotideSubstitution[]
  insertions: NucleotideInsertion[]
  deletions: NucleotideDeletion[]
  alignmentStart: number
  alignmentEnd: number
}

export function analyzeSeq(query: string[], ref: string[]): AnalyzeSeqResult {
  // report insertions
  let refPos = 0
  let ins = ''
  let insStart = -1
  const insertions: NucleotideInsertion[] = []
  ref.forEach((d, i) => {
    if (d === '-') {
      if (ins === '') {
        insStart = refPos
      }
      ins += query[i]
    } else {
      if (ins.length > 0) {
        insertions.push({ pos: insStart, ins })
        ins = ''
      }
      refPos += 1
    }
  })
  // add insertion at the end of the reference if it exists
  if (ins) {
    insertions.push({ pos: insStart, ins })
  }
  // strip insertions relative to reference
  const refStrippedQuery = query.filter((d, i) => ref[i] !== '-')
  const refStripped = ref.filter((d) => d !== '-')

  // report mutations
  let nDel = 0
  let delPos = -1
  let beforeAlignment = true
  const substitutions: NucleotideSubstitution[] = []
  const deletions: NucleotideDeletion[] = []
  let alignmentStart = -1
  let alignmentEnd = -1
  refStrippedQuery.forEach((d, i) => {
    if (d !== '-') {
      if (beforeAlignment) {
        alignmentStart = i
        beforeAlignment = false
      } else if (nDel) {
        deletions.push({ start: delPos, length: nDel } as NucleotideDeletion)
        nDel = 0
      }
      alignmentEnd = i
    }

    const refNuc = refStripped[i] as Nucleotide
    if (d !== '-' && d !== refNuc && canonicalNucleotides.has(d)) {
      substitutions.push({ pos: i, refNuc, queryNuc: d as Nucleotide })
    } else if (d === '-' && !beforeAlignment) {
      if (!nDel) {
        delPos = i
      }
      nDel++
    }
  })
  return { substitutions, insertions, deletions, alignmentStart, alignmentEnd }
}
