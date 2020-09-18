import type { Nucleotide, NucleotideLocation, NucleotideSubstitution, PcrPrimer, Range } from 'src/algorithms/types'
import { shouldReportPrimerMutation } from 'src/algorithms/getPcrPrimerChanges'
import { A } from 'src/algorithms/nucleotides'

function makePrimer({ range, nonACGTs }: { range: Range; nonACGTs: { pos: number; nuc: string }[] }): PcrPrimer {
  return {
    range,
    nonACGTs: nonACGTs as NucleotideLocation[],

    // Set fields that should not be accessed to null to trigger crashes on access
    name: (null as unknown) as string,
    target: (null as unknown) as string,
    source: (null as unknown) as string,
    rootOligonuc: (null as unknown) as string,
    primerOligonuc: (null as unknown) as string,
  }
}

function makeMutation({ pos, queryNuc }: { pos: number; queryNuc: string }): NucleotideSubstitution {
  return {
    pos,
    queryNuc: queryNuc as Nucleotide,

    // Set fields that should not be accessed to null to trigger crashes on access
    refNuc: (null as unknown) as Nucleotide,
  }
}

describe('shouldReportPrimerMutation', () => {
  it('should report when inside and there are no non-ACGTs in the primer', () => {
    const mut = makeMutation({
      pos: 12,
      queryNuc: A,
    })

    const primer = makePrimer({
      range: { begin: 10, end: 15 },
      nonACGTs: [],
    })

    expect(shouldReportPrimerMutation(mut, primer)).toBeTrue()
  })

  it("should report when inside and non-ACGTs nucleotide doesn't match", () => {
    const mut = makeMutation({
      pos: 12,
      queryNuc: A,
    })

    const primer = makePrimer({
      range: { begin: 10, end: 15 },
      nonACGTs: [{ pos: 12, nuc: 'S' /* G or C */ }],
    })

    expect(shouldReportPrimerMutation(mut, primer)).toBeTrue()
  })

  it("should report when inside and non-ACGTs position doesn't match", () => {
    const mut = makeMutation({
      pos: 12,
      queryNuc: A,
    })

    const primer = makePrimer({
      range: { begin: 10, end: 15 },
      nonACGTs: [
        { pos: 5, nuc: 'R' /* A or G */ },
        { pos: 20, nuc: 'R' /* A or G */ },
      ],
    })

    expect(shouldReportPrimerMutation(mut, primer)).toBeTrue()
  })

  it('should NOT report when outside', () => {
    const mut = makeMutation({
      pos: 8,
      queryNuc: A,
    })

    const primer = makePrimer({
      range: { begin: 10, end: 15 },
      nonACGTs: [{ pos: 12, nuc: 'R' /* A or G */ }],
    })

    expect(shouldReportPrimerMutation(mut, primer)).toBeFalse()
  })

  it('should NOT report when inside AND both non-ACGTs nucleotide AND position matches', () => {
    const mut = makeMutation({
      pos: 12,
      queryNuc: A,
    })

    const primer = makePrimer({
      range: { begin: 10, end: 15 },
      nonACGTs: [{ pos: 12, nuc: 'R' /* A or G */ }],
    })

    expect(shouldReportPrimerMutation(mut, primer)).toBeFalse()
  })

  it('should NOT report when inside AND both non-ACGTs nucleotide AND position matches for some', () => {
    const mut = makeMutation({
      pos: 12,
      queryNuc: A,
    })

    const primer = makePrimer({
      range: { begin: 10, end: 15 },
      nonACGTs: [
        { pos: 4, nuc: 'R' /* A or G */ },
        { pos: 12, nuc: 'S' /* G or C */ },
        { pos: 12, nuc: 'R' /* A or G */ },
        { pos: 19, nuc: 'R' /* A or G */ },
      ],
    })

    expect(shouldReportPrimerMutation(mut, primer)).toBeFalse()
  })

  it('should NOT report when inside AND position matches AND nucleotide is the same ', () => {
    const mut = makeMutation({
      pos: 12,
      queryNuc: 'R',
    })

    const primer = makePrimer({
      range: { begin: 10, end: 15 },
      nonACGTs: [{ pos: 12, nuc: 'R' /* A or G */ }],
    })

    expect(shouldReportPrimerMutation(mut, primer)).toBeFalse()
  })
})
