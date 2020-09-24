import { alignPairwise } from '../alignPairwise'

const minimalLength = 0

const queryTest =   'ACATCTT' // prettier-ignore
const refTest = 'ACATATGGCACTT' // prettier-ignore

const queryTestAln = 'ACAT------CTT' // prettier-ignore
const refTestAln =   'ACATATGGCACTT' // prettier-ignore

const longRef = 'CTTGGAGGTTCCGTGGCTAGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTGAGCCTTTGT' // prettier-ignore
const longQuery = 'CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATCAAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT' // prettier-ignore

const longRefAln =   'CTTGGAGGTTCCGTGGCTA----GATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTG---AGCCTTTGT' // prettier-ignore
const longQueryAln = 'CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATC-----AAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT' // prettier-ignore

describe('alignPairwise', () => {
  it('should match up identical stings', () => {
    expect(alignPairwise('ACGCTCGCT', 'ACGCTCGCT', minimalLength)).toMatchObject({
      query: 'ACGCTCGCT'.split(''), // prettier-ignore
      ref:   'ACGCTCGCT'.split(''), // prettier-ignore
    })
  })

  it('should pad missing sequence on the left', () => {
    expect(alignPairwise('CTCGCT', 'ACGCTCGCT', minimalLength)).toMatchObject({
      query: '---CTCGCT'.split(''), // prettier-ignore
      ref:   'ACGCTCGCT'.split(''), // prettier-ignore
    })
  })

  it('should pad missing sequence on the right', () => {
    expect(alignPairwise('ACGCTC', 'ACGCTCGCT', minimalLength)).toMatchObject({
      query: 'ACGCTC---'.split(''), // prettier-ignore
      ref:   'ACGCTCGCT'.split(''), // prettier-ignore
    })
  })

  it('should handle query contained in reference', () => {
    expect(alignPairwise('ACGCTC', 'GCCACGCTCGCT', minimalLength)).toMatchObject({
      query: '---ACGCTC---'.split(''), // prettier-ignore
      ref: 'GCCACGCTCGCT'.split(''), // prettier-ignore
    })
  })

  it('should handle reference contained in query', () => {
    expect(alignPairwise('GCCACGCTCGCT', 'ACGCTC', minimalLength)).toMatchObject({
      query: 'GCCACGCTCGCT'.split(''), // prettier-ignore
      ref:   '---ACGCTC---'.split(''), // prettier-ignore
    })
  })

  it('should introduce gaps in query with one mismatch', () => {
    expect(alignPairwise('GCCACTCCCT', 'GCCACGCTCGCT', minimalLength)).toMatchObject({
      query: 'GCCAC--TCCCT'.split(''), // prettier-ignore
      ref:   'GCCACGCTCGCT'.split(''), // prettier-ignore
    })
  })

  it('should introduce gaps in ref with one ambigous but matching character', () => {
    expect(alignPairwise('GCCACGCTCRCT', 'GCCACTCGCT', minimalLength)).toMatchObject({
      query: 'GCCACGCTCRCT'.split(''), // prettier-ignore
      ref:   'GCCAC--TCGCT'.split(''), // prettier-ignore
    })
  })

  it('should correctly align ambiguous gap placing case', () => {
    expect(alignPairwise(queryTest, refTest, minimalLength)).toMatchObject({
      query: queryTestAln.split(''),
      ref: refTestAln.split(''),
    })
  })

  it('should correctly align ambiguous gap placing case reversed', () => {
    expect(alignPairwise(refTest, queryTest, minimalLength)).toMatchObject({
      ref: queryTestAln.split(''),
      query: refTestAln.split(''),
    })
  })

  it('should correctly align a long and complex query', () => {
    expect(alignPairwise(longQuery, longRef, minimalLength)).toMatchObject({
      ref: longRefAln.split(''),
      query: longQueryAln.split(''),
    })
  })
})
