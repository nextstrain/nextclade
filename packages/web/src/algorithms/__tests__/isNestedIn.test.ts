import { contains } from 'src/algorithms/haveIntersectionStrict'

describe('contains', () => {
  // Accepts

  it('should accept nested', () => {
    expect(contains({ big: { begin: -5, end: 10 }, small: { begin: -3, end: 6 } })).toBeTrue()
  })

  it('should accept nested positive', () => {
    expect(contains({ big: { begin: 1, end: 10 }, small: { begin: 3, end: 6 } })).toBeTrue()
  })

  it('should accept nested negative', () => {
    expect(contains({ big: { begin: 1, end: 10 }, small: { begin: 3, end: 6 } })).toBeTrue()
  })

  // Rejects

  it('should reject partial intersection right', () => {
    expect(contains({ big: { begin: -5, end: 10 }, small: { begin: 3, end: 12 } })).toBeFalse()
  })

  it('should reject partial intersection left', () => {
    expect(contains({ big: { begin: 3, end: 12 }, small: { begin: -5, end: 10 } })).toBeFalse()
  })

  it('should reject disjoint right', () => {
    expect(contains({ big: { begin: 1, end: 10 }, small: { begin: 15, end: 21 } })).toBeFalse()
  })

  it('should reject disjoint left', () => {
    expect(contains({ big: { begin: 15, end: 21 }, small: { begin: 1, end: 10 } })).toBeFalse()
  })

  it('should reject empty zero', () => {
    expect(contains({ big: { begin: 0, end: 0 }, small: { begin: 0, end: 0 } })).toBeFalse()
  })

  it('should reject empty non-zero same', () => {
    expect(contains({ big: { begin: 5, end: 5 }, small: { begin: 5, end: 5 } })).toBeFalse()
  })

  it('should reject empty non-zero different right', () => {
    expect(contains({ big: { begin: 1, end: 1 }, small: { begin: 5, end: 5 } })).toBeFalse()
  })

  it('should reject empty non-zero different left', () => {
    expect(contains({ big: { begin: 5, end: 5 }, small: { begin: 1, end: 1 } })).toBeFalse()
  })

  it('should reject empty and non-empty nested', () => {
    expect(contains({ big: { begin: -5, end: 10 }, small: { begin: 3, end: 3 } })).toBeFalse()
  })

  it('should reject empty and non-empty nested zero', () => {
    expect(contains({ big: { begin: -5, end: 10 }, small: { begin: 0, end: 0 } })).toBeFalse()
  })

  it('should reject empty and non-empty disjoint right', () => {
    expect(contains({ big: { begin: 1, end: 1 }, small: { begin: 5, end: 5 } })).toBeFalse()
  })

  it('should reject empty and non-empty disjoint left', () => {
    expect(contains({ big: { begin: 5, end: 5 }, small: { begin: 1, end: 1 } })).toBeFalse()
  })

  it('should reject adjacent right', () => {
    expect(contains({ big: { begin: -7, end: 11 }, small: { begin: 11, end: 17 } })).toBeFalse()
  })

  it('should reject adjacent left', () => {
    expect(contains({ big: { begin: -3, end: 5 }, small: { begin: 5, end: 17 } })).toBeFalse()
  })

  it('should reject adjacent empty right', () => {
    expect(contains({ big: { begin: -7, end: 11 }, small: { begin: 11, end: 11 } })).toBeFalse()
  })

  it('should reject adjacent empty left', () => {
    expect(contains({ big: { begin: -3, end: 5 }, small: { begin: 5, end: 5 } })).toBeFalse()
  })

  it('should reject adjacent at zero', () => {
    expect(contains({ big: { begin: -3, end: 0 }, small: { begin: 0, end: 7 } })).toBeFalse()
  })

  it('should reject adjacent at zero right', () => {
    expect(contains({ big: { begin: -3, end: 0 }, small: { begin: 0, end: 0 } })).toBeFalse()
  })

  it('should reject adjacent at zero left', () => {
    expect(contains({ big: { begin: 0, end: 0 }, small: { begin: -3, end: 0 } })).toBeFalse()
  })
})
