import { alignPairwise, alignmentParameters } from '../alignPairwise'

const refTest =   'ACATCTT'
const queryTest = 'ACATATGGCACTT'

const refTestAln   = 'ACAT------CTT'
const queryTestAln = 'ACATATGGCACTT'

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

  it('should introduce gaps in query with one mismatch', () => {
    expect(alignPairwise('GCCACTCCCT', 'GCCACGCTCGCT')).toStrictEqual({
      query: 'GCCA--CTCCCT'.split(''),
      ref:   'GCCACGCTCGCT'.split(''),
      alignmentScore:
        9 * alignmentParameters.match +
        alignmentParameters.misMatch +
        alignmentParameters.gapOpen +
        2 * alignmentParameters.gapExtend,
    })
  })

  it('should introduce gaps in ref with one ambigous but matching character', () => {
    expect(alignPairwise('GCCACGCTCRCT', 'GCCACTCGCT')).toStrictEqual({
      query: 'GCCACGCTCRCT'.split(''),
      ref:   'GCCA--CTCGCT'.split(''),
      alignmentScore:
        10 * alignmentParameters.match +
        alignmentParameters.gapOpen +
        2 * alignmentParameters.gapExtend,
    })
  })

  it('should correctly align a complex query', () => {
    expect(alignPairwise(queryTest, refTest)).toStrictEqual({
      query: queryTestAln.split(''),
      ref: refTestAln.split(''),
      alignmentScore: 7 * alignmentParameters.match + alignmentParameters.gapOpen + 6 * alignmentParameters.gapExtend,
    })
  })

})

