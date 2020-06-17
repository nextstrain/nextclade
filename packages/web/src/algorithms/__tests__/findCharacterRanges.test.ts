import { findCharacterRanges } from '../findCharacterRanges'

describe('findCharacterRanges', () => {
  it('should find no substrings in the empty string', () => {
    expect(findCharacterRanges('', 'b')).toStrictEqual([])
  })

  it('should find no substrings when no match', () => {
    expect(findCharacterRanges('aaaaaa', 'b')).toStrictEqual([])
  })

  it('should find a single character: begin', () => {
    expect(findCharacterRanges('baaaaaaaa', 'b')).toStrictEqual([
      { character: 'b', range: { begin: 0, end: 1 } }, // prettier-ignore
    ])
  })

  it('should find a single character: middle', () => {
    expect(findCharacterRanges('aabaaaaa', 'b')).toStrictEqual([
      { character: 'b', range: { begin: 2, end: 3 } }, // prettier-ignore
    ])
  })

  it('should find a single character: end', () => {
    expect(findCharacterRanges('aaaaaaaab', 'b')).toStrictEqual([
      { character: 'b', range: { begin: 7, end: 8 } }, // prettier-ignore
    ])
  })

  it('should find 1 substring', () => {
    expect(findCharacterRanges('aabbaaaaa', 'b')).toStrictEqual([
      { character: 'b', range: { begin: 2, end: 4 } }, // prettier-ignore
    ])
  })

  it('should find 2 substrings', () => {
    expect(findCharacterRanges('aabbacbba', 'b')).toStrictEqual([
      { character: 'b', range: { begin: 2, end: 4 } },
      { character: 'b', range: { begin: 6, end: 8 } },
    ])
  })

  it('should find substrings for different characters', () => {
    expect(findCharacterRanges('aabbaccca', 'cb')).toStrictEqual([
      { character: 'c', range: { begin: 5, end: 8 } },
      { character: 'b', range: { begin: 2, end: 4 } },
    ])
  })
})
