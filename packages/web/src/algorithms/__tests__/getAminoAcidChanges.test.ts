import type { Gene } from 'src/algorithms/types'
import { alignPairwise } from 'src/algorithms/alignPairwise'
import { analyzeSeq } from 'src/algorithms/analyzeSeq'
import { getAminoAcidChanges } from 'src/algorithms/getAminoAcidChanges'

import { rootSeq } from 'src/algorithms/defaults/sars-cov-2/rootSeq'

const geneMap: Gene[] = [
  {
    name: 'ORF1a',
    color: '#222222',
    range: {
      begin: 265,
      end: 13468,
    },
    frame: 0,
  },
]

function replace(seq: string, nucs: string, from: number) {
  return seq.slice(0, from) + nucs + seq.slice(from + nucs.length)
}

function remove(seq: string, from: number, to: number) {
  return seq.slice(0, from) + seq.slice(to)
}

describe('getAminoAcidChanges', () => {
  it('should find aminoacid substitution', () => {
    const subStart = 1342
    const seq = replace(rootSeq, 'ACT', subStart)

    const { query, ref } = alignPairwise(seq, rootSeq, 100)
    const analyzeSeqResult = analyzeSeq(query, ref)
    const { substitutions: nucSubstitutions, deletions: nucDeletions } = analyzeSeqResult

    // prettier-ignore
    const { aaSubstitutions, aaDeletions, substitutionsWithAA, deletionsWithAA } =
      getAminoAcidChanges(nucSubstitutions, nucDeletions, rootSeq, geneMap)

    expect(nucSubstitutions).toStrictEqual([
      { pos: 1342, refNuc: 'T', queryNuc: 'A' },
      { pos: 1343, refNuc: 'T', queryNuc: 'C' },
      { pos: 1344, refNuc: 'A', queryNuc: 'T' },
    ])

    const aaSubExpected = {
      codon: 359,
      gene: 'ORF1a',
      nucRange: {
        begin: 1342,
        end: 1345,
      },
      refAA: 'L',
      refCodon: 'TTA',
      queryAA: 'T',
      queryCodon: 'ACT',
    }

    expect(aaSubstitutions).toStrictEqual([aaSubExpected])

    expect(substitutionsWithAA).toStrictEqual([
      { pos: 1342, refNuc: 'T', queryNuc: 'A', aaSubstitutions: [aaSubExpected] },
      { pos: 1343, refNuc: 'T', queryNuc: 'C', aaSubstitutions: [aaSubExpected] },
      { pos: 1344, refNuc: 'A', queryNuc: 'T', aaSubstitutions: [aaSubExpected] },
    ])

    expect(nucDeletions).toStrictEqual([])
    expect(aaDeletions).toStrictEqual([])
    expect(deletionsWithAA).toStrictEqual([])
  })

  it('should find aminoacid deletion', () => {
    const delStart = 1342
    const seq = remove(rootSeq, delStart, delStart + 3)

    const { query, ref } = alignPairwise(seq, rootSeq, 100)
    const analyzeSeqResult = analyzeSeq(query, ref)
    const { substitutions: nucSubstitutions, deletions: nucDeletions } = analyzeSeqResult

    // prettier-ignore
    const { aaSubstitutions, aaDeletions, substitutionsWithAA, deletionsWithAA } =
      getAminoAcidChanges(nucSubstitutions, nucDeletions, rootSeq, geneMap)

    expect(nucSubstitutions).toStrictEqual([])
    expect(aaSubstitutions).toStrictEqual([])
    expect(substitutionsWithAA).toStrictEqual([])

    expect(nucDeletions).toStrictEqual([{ start: delStart, length: 3 }])

    const aaDelExpected = {
      refAA: 'L',
      codon: 359,
      gene: 'ORF1a',
      nucRange: { begin: 1342, end: 1345 },
      refCodon: 'TTA',
    }

    expect(aaDeletions).toStrictEqual([aaDelExpected])

    expect(deletionsWithAA).toStrictEqual([{ start: delStart, length: 3, aaDeletions: [aaDelExpected] }])
  })
})
