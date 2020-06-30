import { alignPairwise, alignmentParameters } from '../alignPairwise'

describe('alignPairwise', () => {
  it('should match up identical stings', () => {
    expect(alignPairwise('ACGCTCGCT', 'ACGCTCGCT')).toStrictEqual({
      query: 'ACGCTCGCT'.split(''),
      ref:   'ACGCTCGCT'.split(''),
      alignmentScore: 'ACGCTCGCT'.length * alignmentParameters.match,
    })
  })

  it('should pad missing sequence on the left', () => {
    expect(alignPairwise('CTCGCT', 'ACGCTCGCT')).toStrictEqual({
      query: '---CTCGCT'.split(''),
      ref:   'ACGCTCGCT'.split(''),
      alignmentScore: 'CTCGCT'.length * alignmentParameters.match,
    })
  })

  it('should pad missing sequence on the right', () => {
    expect(alignPairwise('ACGCTC', 'ACGCTCGCT')).toStrictEqual({
      query: 'ACGCTC---'.split(''),
      ref:   'ACGCTCGCT'.split(''),
      alignmentScore: 'ACGCTC'.length * alignmentParameters.match,
    })
  })

  it('should handle query contained in reference', () => {
    expect(alignPairwise('ACGCTC', 'GCCACGCTCGCT')).toStrictEqual({
      query: '---ACGCTC---'.split(''),
      ref:   'GCCACGCTCGCT'.split(''),
      alignmentScore: 'ACGCTC'.length * alignmentParameters.match,
    })
  })

  it('should handle reference contained in query', () => {
    expect(alignPairwise('GCCACGCTCGCT', 'ACGCTC')).toStrictEqual({
      query: 'GCCACGCTCGCT'.split(''),
      ref:   '---ACGCTC---'.split(''),
      alignmentScore: 'ACGCTC'.length * alignmentParameters.match,
    })
  })
})
