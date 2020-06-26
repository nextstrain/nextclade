import { A, T } from 'src/algorithms/nucleotides'

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
      { character: T, range: { begin: 0, end: 1 } }, // prettier-ignore
    ])
  })

  it('should find a single character: middle', () => {
    expect(findNucleotideRanges('GGCNATAGC', T)).toStrictEqual([
      { character: T, range: { begin: 5, end: 6 } }, // prettier-ignore
    ])
  })

  it('should find a single character: end', () => {
    expect(findNucleotideRanges('GGCNAAGCT', T)).toStrictEqual([
      { character: T, range: { begin: 8, end: 9 } }, // prettier-ignore
    ])
  })

  it('should find 1 substring', () => {
    expect(findNucleotideRanges('GGNTTTAAGCC', T)).toStrictEqual([
      { character: T, range: { begin: 3, end: 6 } }, // prettier-ignore
    ])
  })

  it('should find 2 substrings', () => {
    expect(findNucleotideRanges('GGNTTTANTTGCC', T)).toStrictEqual([
      { character: T, range: { begin: 3, end: 6 } },
      { character: T, range: { begin: 8, end: 10 } },
    ])
  })

  it('should find 2 substrings: begin and middle', () => {
    expect(findNucleotideRanges('TTGGNTTTANGCC', T)).toStrictEqual([
      { character: T, range: { begin: 0, end: 2 } },
      { character: T, range: { begin: 5, end: 8 } },
    ])
  })
})
