import { isMatch } from 'src/algorithms/nucleotideCodes'

describe('isMatch', () => {
  it('should match any canonical with N', () => {
    expect(isMatch('N', 'A')).toBeTrue()
    expect(isMatch('A', 'N')).toBeTrue()
  })

  it('should match any ambiguous with N', () => {
    expect(isMatch('N', 'S')).toBeTrue()
    expect(isMatch('S', 'N')).toBeTrue()
  })

  it('should match ambiguous R with A', () => {
    expect(isMatch('R', 'A')).toBeTrue()
    expect(isMatch('A', 'R')).toBeTrue()
  })

  it('should NOT match ambiguous R with C', () => {
    expect(isMatch('R', 'C')).toBeFalse()
    expect(isMatch('C', 'R')).toBeFalse()
  })

  it('should match ambiguous S with C', () => {
    expect(isMatch('S', 'C')).toBeTrue()
    expect(isMatch('C', 'S')).toBeTrue()
  })

  it('should NOT match ambiguous S with A', () => {
    expect(isMatch('A', 'S')).toBeFalse()
    expect(isMatch('S', 'A')).toBeFalse()
  })
})
