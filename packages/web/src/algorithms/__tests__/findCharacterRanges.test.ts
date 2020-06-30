import { A, GOOD_NUCLEOTIDES, T } from 'src/algorithms/nucleotides'

import { findNucleotideRanges } from '../findNucleotideRanges'

describe('findCharacterRanges', () => {
  it('should find no substrings in empty string', () => {
    expect(findNucleotideRanges('', A)).toStrictEqual([])
  })

  it('should find no substrings when no match', () => {
    expect(findNucleotideRanges('TCC-GCTN', A)).toStrictEqual([])
  })

  it('should find a single character: begin', () => {
    expect(findNucleotideRanges('TGGCNAAGC', T)).toStrictEqual([
      { nuc: T, begin: 0, end: 1  }, // prettier-ignore
    ])
  })

  it('should find a single character: middle', () => {
    expect(findNucleotideRanges('GGCNATAGC', T)).toStrictEqual([
      { nuc: T, begin: 5, end: 6  }, // prettier-ignore
    ])
  })

  it('should find a single character: end', () => {
    expect(findNucleotideRanges('GGCNAAGCT', T)).toStrictEqual([
      { nuc: T, begin: 8, end: 9  }, // prettier-ignore
    ])
  })

  it('should find 1 substring', () => {
    expect(findNucleotideRanges('GGNTTTAAGCC', T)).toStrictEqual([
      { nuc: T, begin: 3, end: 6  }, // prettier-ignore
    ])
  })

  it('should find 2 substrings', () => {
    expect(findNucleotideRanges('GGNTTTANTTGCC', T)).toStrictEqual([
      { nuc: T, begin: 3, end: 6 },
      { nuc: T, begin: 8, end: 10 },
    ])
  })

  it('should find 2 substrings one character apart', () => {
    expect(findNucleotideRanges('GGNTTTNTTGCC', T)).toStrictEqual([
      { nuc: T, begin: 3, end: 6 },
      { nuc: T, begin: 7, end: 9 },
    ])
  })

  it('should find 2 substrings: begin and middle', () => {
    expect(findNucleotideRanges('TTGGNTTTANGCC', T)).toStrictEqual([
      { nuc: T, begin: 0, end: 2 },
      { nuc: T, begin: 5, end: 8 },
    ])
  })

  it('should use predicate', () => {
    expect(findNucleotideRanges('TTGGNTTTANGCCTTT', (nuc) => nuc === T)).toStrictEqual([
      { nuc: T, begin: 0, end: 2 },
      { nuc: T, begin: 5, end: 8 },
      { nuc: T, begin: 13, end: 16 },
    ])
  })

  it('should use predicate with multiple characters', () => {
    expect(findNucleotideRanges('TGNYYYTTTZZZZCCTTT', (nuc) => !GOOD_NUCLEOTIDES.includes(nuc))).toStrictEqual([
      { nuc: 'Y', begin: 3, end: 6 },
      { nuc: 'Z', begin: 9, end: 13 },
    ])
  })

  it('should find consecutive ranges', () => {
    expect(findNucleotideRanges('TGNYYYZZZZCCTTT', (nuc) => !GOOD_NUCLEOTIDES.includes(nuc))).toStrictEqual([
      { nuc: 'Y', begin: 3, end: 6 },
      { nuc: 'Z', begin: 6, end: 10 },
    ])
  })
})
