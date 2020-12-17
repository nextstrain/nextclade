import { inRange } from 'src/algorithms/haveIntersectionStrict'

describe('inRange', () => {
  // Accepts

  it('should accept contained positive', () => {
    expect(inRange(13, { begin: 7, end: 21 })).toBeTrue()
  })

  it('should accept contained negative', () => {
    expect(inRange(-5, { begin: -21, end: 7 })).toBeTrue()
  })

  it('should accept contained zero', () => {
    expect(inRange(0, { begin: -7, end: 21 })).toBeTrue()
  })

  it('should accept lower boundary', () => {
    expect(inRange(-7, { begin: -7, end: 21 })).toBeTrue()
  })

  // Rejects

  it('should reject not contained left', () => {
    expect(inRange(-10, { begin: -7, end: 21 })).toBeFalse()
  })

  it('should reject not contained right', () => {
    expect(inRange(33, { begin: -7, end: 21 })).toBeFalse()
  })

  it('should reject when range is empty', () => {
    expect(inRange(7, { begin: 7, end: 7 })).toBeFalse()
  })

  it('should reject upper boundary', () => {
    expect(inRange(21, { begin: -7, end: 21 })).toBeFalse()
  })
})
