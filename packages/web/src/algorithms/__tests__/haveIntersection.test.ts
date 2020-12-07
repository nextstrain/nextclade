import { haveIntersectionStrict } from 'src/algorithms/haveIntersectionStrict'

describe('haveIntersection', () => {
  // Accepts

  it('should accept partial intersection right', () => {
    expect(haveIntersectionStrict({ begin: -5, end: 10 }, { begin: 3, end: 12 })).toBeTrue()
  })

  it('should accept partial intersection left', () => {
    expect(haveIntersectionStrict({ begin: 3, end: 12 }, { begin: -5, end: 10 })).toBeTrue()
  })

  it('should accept nested', () => {
    expect(haveIntersectionStrict({ begin: -5, end: 10 }, { begin: -3, end: 6 })).toBeTrue()
  })

  it('should accept nested positive', () => {
    expect(haveIntersectionStrict({ begin: 1, end: 10 }, { begin: 3, end: 6 })).toBeTrue()
  })

  it('should accept nested negative', () => {
    expect(haveIntersectionStrict({ begin: 1, end: 10 }, { begin: 3, end: 6 })).toBeTrue()
  })

  // Rejects

  it('should reject disjoint right', () => {
    expect(haveIntersectionStrict({ begin: 1, end: 10 }, { begin: 15, end: 21 })).toBeFalse()
  })

  it('should reject disjoint left', () => {
    expect(haveIntersectionStrict({ begin: 15, end: 21 }, { begin: 1, end: 10 })).toBeFalse()
  })

  it('should reject empty zero', () => {
    expect(haveIntersectionStrict({ begin: 0, end: 0 }, { begin: 0, end: 0 })).toBeFalse()
  })

  it('should reject empty non-zero same', () => {
    expect(haveIntersectionStrict({ begin: 5, end: 5 }, { begin: 5, end: 5 })).toBeFalse()
  })

  it('should reject empty non-zero different right', () => {
    expect(haveIntersectionStrict({ begin: 1, end: 1 }, { begin: 5, end: 5 })).toBeFalse()
  })

  it('should reject empty non-zero different left', () => {
    expect(haveIntersectionStrict({ begin: 5, end: 5 }, { begin: 1, end: 1 })).toBeFalse()
  })

  it('should reject empty and non-empty nested', () => {
    expect(haveIntersectionStrict({ begin: -5, end: 10 }, { begin: 3, end: 3 })).toBeFalse()
  })

  it('should reject empty and non-empty nested zero', () => {
    expect(haveIntersectionStrict({ begin: -5, end: 10 }, { begin: 0, end: 0 })).toBeFalse()
  })

  it('should reject empty and non-empty disjoint right', () => {
    expect(haveIntersectionStrict({ begin: 1, end: 1 }, { begin: 5, end: 5 })).toBeFalse()
  })

  it('should reject empty and non-empty disjoint left', () => {
    expect(haveIntersectionStrict({ begin: 5, end: 5 }, { begin: 1, end: 1 })).toBeFalse()
  })

  it('should reject adjacent right', () => {
    expect(haveIntersectionStrict({ begin: -7, end: 11 }, { begin: 11, end: 17 })).toBeFalse()
  })

  it('should reject adjacent left', () => {
    expect(haveIntersectionStrict({ begin: -3, end: 5 }, { begin: 5, end: 17 })).toBeFalse()
  })

  it('should reject adjacent empty right', () => {
    expect(haveIntersectionStrict({ begin: -7, end: 11 }, { begin: 11, end: 11 })).toBeFalse()
  })

  it('should reject adjacent empty left', () => {
    expect(haveIntersectionStrict({ begin: -3, end: 5 }, { begin: 5, end: 5 })).toBeFalse()
  })

  it('should reject adjacent at zero', () => {
    expect(haveIntersectionStrict({ begin: -3, end: 0 }, { begin: 0, end: 7 })).toBeFalse()
  })

  it('should reject adjacent at zero right', () => {
    expect(haveIntersectionStrict({ begin: -3, end: 0 }, { begin: 0, end: 0 })).toBeFalse()
  })

  it('should reject adjacent at zero left', () => {
    expect(haveIntersectionStrict({ begin: 0, end: 0 }, { begin: -3, end: 0 })).toBeFalse()
  })
})
