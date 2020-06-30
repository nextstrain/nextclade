import { alignPairwise, alignmentParameters } from '../alignPairwise'

const queryTest =   'ACATCTT'
const refTest = 'ACATATGGCACTT'

const queryTestAln = 'ACAT------CTT'
const refTestAln =   'ACATATGGCACTT'

const longRef = 'CTTGGAGGTTCCGTGGCTAGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTGAGCCTTTGT'
const longQuery = 'CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATCAAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT'

const longRefAln =   'CTTGGAGGTTCCGTGGCTA----GATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTG---AGCCTTTGT'
const longQueryAln = 'CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATC-----AAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT'

describe('alignPairwise', () => {
  it('should match up identical stings', () => {
    expect(alignPairwise('ACGCTCGCT', 'ACGCTCGCT')).toMatchObject({
      query: 'ACGCTCGCT'.split(''),
      ref:   'ACGCTCGCT'.split(''),
    })
  })

  it('should pad missing sequence on the left', () => {
    expect(alignPairwise('CTCGCT', 'ACGCTCGCT')).toMatchObject({
      query: '---CTCGCT'.split(''),
      ref:   'ACGCTCGCT'.split(''),
    })
  })

  it('should pad missing sequence on the right', () => {
    expect(alignPairwise('ACGCTC', 'ACGCTCGCT')).toMatchObject({
      query: 'ACGCTC---'.split(''),
      ref: 'ACGCTCGCT'.split(''),
    })
  })

  it('should handle query contained in reference', () => {
    expect(alignPairwise('ACGCTC', 'GCCACGCTCGCT')).toMatchObject({
      query: '---ACGCTC---'.split(''),
      ref: 'GCCACGCTCGCT'.split(''),
    })
  })

  it('should handle reference contained in query', () => {
    expect(alignPairwise('GCCACGCTCGCT', 'ACGCTC')).toMatchObject({
      query: 'GCCACGCTCGCT'.split(''),
      ref: '---ACGCTC---'.split(''),
    })
  })

  it('should introduce gaps in query with one mismatch', () => {
    expect(alignPairwise('GCCACTCCCT', 'GCCACGCTCGCT')).toMatchObject({
      query: 'GCCAC--TCCCT'.split(''),
      ref:   'GCCACGCTCGCT'.split(''),
      alignmentScore:
        9 * alignmentParameters.match +
        alignmentParameters.misMatch +
        alignmentParameters.gapOpen +
        alignmentParameters.gapClose +
        2 * alignmentParameters.gapExtend,
    })
  })

  it('should introduce gaps in ref with one ambigous but matching character', () => {
    expect(alignPairwise('GCCACGCTCRCT', 'GCCACTCGCT')).toMatchObject({
      query: 'GCCACGCTCRCT'.split(''),
      ref:   'GCCAC--TCGCT'.split(''),
      alignmentScore:
        10 * alignmentParameters.match +
        alignmentParameters.gapOpen +
        alignmentParameters.gapClose +
        2 * alignmentParameters.gapExtend,
    })
  })

  it('should correctly align ambiguous gap placing case', () => {
    expect(alignPairwise(queryTest, refTest)).toMatchObject({
      query: queryTestAln.split(''),
      ref: refTestAln.split(''),
    })
  })

  it('should correctly align ambiguous gap placing case reversed', () => {
    expect(alignPairwise(refTest, queryTest)).toMatchObject({
      ref: queryTestAln.split(''),
      query: refTestAln.split(''),
    })
  })

  it('should correctly align a long and complex query', () => {
    expect(alignPairwise(longQuery, longRef)).toMatchObject({
      query: longQueryAln.split(''),
      ref: longRefAln.split(''),
    })
  })
})
