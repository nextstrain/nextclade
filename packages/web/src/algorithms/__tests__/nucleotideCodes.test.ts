import { isMatch } from 'src/algorithms/nucleotideCodes'

describe('isMatch', () => {
  it('should match any with N', () => {
    expect(isMatch('N', 'A')).toBeTrue()
    expect(isMatch('N', 'C')).toBeTrue()
  })

  it('should match ambiguous R with A', () => {
    expect(isMatch('R', 'A')).toBeTrue()
  })

  it('should NOT match ambiguous R with C', () => {
    expect(isMatch('R', 'A')).toBeTrue()
  })

  it('should match ambiguous S with C', () => {
    expect(isMatch('S', 'C')).toBeTrue()
  })

  it('should NOT match ambiguous S with A', () => {
    expect(isMatch('S', 'C')).toBeTrue()
  })
})
