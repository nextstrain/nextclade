import { parseMutation } from 'src/helpers/parseMutation'

describe('parseMutation', () => {
  it('should parse ref, position, query', () => {
    expect(parseMutation('A123C')).toStrictEqual({ refNuc: 'A', pos: 122, queryNuc: 'C' })
  })

  it('should parse ref', () => {
    expect(parseMutation('A')).toStrictEqual({ refNuc: 'A', pos: undefined, queryNuc: undefined })
  })

  it('should parse position', () => {
    expect(parseMutation('123')).toStrictEqual({ refNuc: undefined, pos: 122, queryNuc: undefined })
  })

  it('should parse position, query', () => {
    expect(parseMutation('123C')).toStrictEqual({ refNuc: undefined, pos: 122, queryNuc: 'C' })
  })

  it('should parse ref, query', () => {
    expect(parseMutation('AC')).toStrictEqual({ refNuc: 'A', pos: undefined, queryNuc: 'C' })
  })

  it('should parse ref ("-")', () => {
    expect(parseMutation('-')).toStrictEqual({ refNuc: '-', pos: undefined, queryNuc: undefined })
  })

  it('should parse any, query', () => {
    expect(parseMutation('.A')).toStrictEqual({ refNuc: undefined, pos: undefined, queryNuc: 'A' })
  })

  it('should parse any, query ("-")', () => {
    expect(parseMutation('.-')).toStrictEqual({ refNuc: undefined, pos: undefined, queryNuc: '-' })
  })

  it('should parse ref, position', () => {
    expect(parseMutation('A123')).toStrictEqual({ refNuc: 'A', pos: 122, queryNuc: undefined })
  })

  it('should parse different ref, position, query', () => {
    expect(parseMutation('T43516N')).toStrictEqual({ refNuc: 'T', pos: 43_515, queryNuc: 'N' })
  })

  it('should parse ref ("-"), position, query', () => {
    expect(parseMutation('-123C')).toStrictEqual({ refNuc: '-', pos: 122, queryNuc: 'C' })
  })

  it('should parse ref ("-"), position, query ("-")', () => {
    expect(parseMutation('A123-')).toStrictEqual({ refNuc: 'A', pos: 122, queryNuc: '-' })
  })

  it('should parse ref if it is "-", position and query nucleotide if is "-"', () => {
    expect(parseMutation('-123-')).toStrictEqual({ refNuc: '-', pos: 122, queryNuc: '-' })
  })

  it('should parse skip, position, query', () => {
    expect(parseMutation('.123C')).toStrictEqual({ refNuc: undefined, pos: 122, queryNuc: 'C' })
  })
})

describe('parseMutation reject', () => {
  it('should reject empty input', () => {
    expect(parseMutation('')).toBeUndefined()
  })

  it('should reject non-mutation-like input', () => {
    expect(parseMutation('hello!')).toBeUndefined()
  })

  it('should reject any', () => {
    expect(parseMutation('.')).toBeUndefined()
  })

  it('should reject any, any', () => {
    expect(parseMutation('..')).toBeUndefined()
  })

  it('should reject multiple letters in ref', () => {
    expect(parseMutation('AC.')).toBeUndefined()
  })

  it('should reject multiple letters in query', () => {
    expect(parseMutation('.GT')).toBeUndefined()
  })

  it('should reject letters in position', () => {
    expect(parseMutation('G1X3T')).toBeUndefined()
  })

  it('should reject dots in position', () => {
    expect(parseMutation('A.C')).toBeUndefined()
  })
})
